import { defaultAbiCoder } from '@ethersproject/abi'
import { Signature } from '@ethersproject/bytes'
import { AddressZero } from '@ethersproject/constants'
import { TransactionResponse } from '@ethersproject/providers'
import { ChainId, Currency, CurrencyAmount, Price } from '@sushiswap/core-sdk'
import { LimitOrder, ROUND_UP_RECEIVER_ADDRESS } from '@sushiswap/limit-order-sdk'
import { CHAINLINK_ORACLE_ADDRESS, STOP_LIMIT_ORDER_WRAPPER_ADDRESSES } from 'app/constants/autonomy'
import useLimitOrders from 'app/features/legacy/limit-order/useLimitOrders'
import { ZERO } from 'app/functions'
import { useAutonomyLimitOrderWrapperContract, useAutonomyRegistryContract } from 'app/hooks'
import { useActiveWeb3React } from 'app/services/web3'
import { useAddPopup } from 'app/state/application/hooks'
import { useAppDispatch } from 'app/state/hooks'
import { clear, setLimitOrderAttemptingTxn } from 'app/state/limit-order/actions'
import { OrderExpiration } from 'app/state/limit-order/reducer'
import { useCallback } from 'react'

import { calculateAmountExternal, prepareStopPriceOracleData, ZERO_ORACLE_ADDRESS, ZERO_ORACLE_DATA } from './utils'

const getEndTime = (orderExpiration: OrderExpiration | string): number => {
  switch (orderExpiration) {
    case OrderExpiration.hour:
      return Math.floor(new Date().getTime() / 1000) + 3600
    case OrderExpiration.day:
      return Math.floor(new Date().getTime() / 1000) + 86400
    case OrderExpiration.week:
      return Math.floor(new Date().getTime() / 1000) + 604800
    case OrderExpiration.never:
    default:
      return Number.MAX_SAFE_INTEGER
  }
}

export type DepositAndApprovePayload = { inputAmount: CurrencyAmount<Currency>; bentoPermit: Signature }
export type DepositPayload = {
  inputAmount?: CurrencyAmount<Currency>
  bentoPermit?: Signature
  fromBentoBalance: boolean
}
export type ExecutePayload = {
  orderExpiration: OrderExpiration | string
  inputAmount?: CurrencyAmount<Currency>
  outputAmount?: CurrencyAmount<Currency>
  recipient?: string
  stopPrice?: Price<Currency, Currency> | undefined
}

export type UseLimitOrderExecuteDeposit = (x: DepositPayload) => Promise<TransactionResponse | undefined>
export type UseLimitOrderExecuteExecute = (x: ExecutePayload) => void
export type UseLimitOrderExecute = () => {
  execute: UseLimitOrderExecuteExecute
}

const useStopLossExecute: UseLimitOrderExecute = () => {
  const { account, chainId, library } = useActiveWeb3React()

  const autonomyRegistryContract = useAutonomyRegistryContract()
  const limitOrderWrapperContract = useAutonomyLimitOrderWrapperContract()

  const dispatch = useAppDispatch()
  const addPopup = useAddPopup()
  const { mutate } = useLimitOrders()

  const execute = useCallback<UseLimitOrderExecuteExecute>(
    async ({ orderExpiration, inputAmount, outputAmount, recipient, stopPrice }) => {
      if (!inputAmount || !outputAmount || !account || !library || !chainId) throw new Error('Dependencies unavailable')

      let oracleData
      if (stopPrice) {
        oracleData = prepareStopPriceOracleData(inputAmount.wrapped, outputAmount.wrapped, stopPrice, chainId)
        // console.log('oracleData: ', JSON.stringify(oracleData))
      }

      const endTime = getEndTime(orderExpiration)
      const order = new LimitOrder(
        account,
        inputAmount.wrapped,
        outputAmount.wrapped,
        recipient ? recipient : account,
        Math.floor(new Date().getTime() / 1000).toString(),
        endTime.toString(),
        oracleData && oracleData.stopPrice ? oracleData.stopPrice : '0',
        oracleData && oracleData.stopPrice ? CHAINLINK_ORACLE_ADDRESS[chainId] : ZERO_ORACLE_ADDRESS,
        oracleData && oracleData.stopPrice ? oracleData.oracleData : ZERO_ORACLE_DATA
      )

      try {
        dispatch(setLimitOrderAttemptingTxn(true))
        await order?.signOrderWithProvider(chainId || 1, library)

        if (autonomyRegistryContract && limitOrderWrapperContract && chainId) {
          const amountExternal = calculateAmountExternal(inputAmount.wrapped, outputAmount.wrapped, chainId)
          if (stopPrice && oracleData?.stopPrice == ZERO_ORACLE_DATA) {
            throw new Error('Unsupported pair')
          }
          const data = defaultAbiCoder.encode(
            ['address[]', 'uint256', 'address', 'bool'],
            [
              [order.tokenInAddress, order.tokenOutAddress], // path
              amountExternal, // amountExternal
              chainId && STOP_LIMIT_ORDER_WRAPPER_ADDRESSES[chainId], // profit receiver
              false, // keepTokenIn, charge fee, by outputToken always
            ]
          )

          const encodedFillOrderData = limitOrderWrapperContract.interface.encodeFunctionData('fillOrder', [
            0, // fee amount, that will be filled later
            [
              order.maker,
              order.amountInRaw,
              order.amountOutRaw,
              order.recipient,
              order.startTime,
              order.endTime,
              order.stopPrice,
              order.oracleAddress,
              order.oracleData,
              order.amountInRaw,
              order.v,
              order.r,
              order.s,
            ],
            order.tokenInAddress,
            order.tokenOutAddress,
            chainId &&
              (chainId == ChainId.AVALANCHE
                ? '0x802290173908ed30A9642D6872e252Ef4f6e59A2'
                : ROUND_UP_RECEIVER_ADDRESS[chainId]),
            data,
          ])
          // console.log('encoded fillOrder() data: ', JSON.stringify(encodedFillOrderData))

          await autonomyRegistryContract.newReq(
            chainId && STOP_LIMIT_ORDER_WRAPPER_ADDRESSES[chainId], // target
            AddressZero, // referer
            encodedFillOrderData, // callData
            ZERO, // ethForCall
            false, // verifyUser
            true, // insertFeeAmount
            false // isAlive
          )
        }

        addPopup({
          txn: { hash: '', summary: 'Stop loss order created', success: true },
        })

        await mutate()
        dispatch(clear())

        dispatch(setLimitOrderAttemptingTxn(false))
      } catch (e: any) {
        dispatch(setLimitOrderAttemptingTxn(false))
        addPopup({
          txn: {
            hash: '',
            // @ts-ignore TYPE NEEDS FIXING
            summary: `Error: ${e?.message}`,
            success: false,
          },
        })
      }
    },
    [account, addPopup, chainId, dispatch, library, autonomyRegistryContract, limitOrderWrapperContract]
  )

  return {
    execute,
  }
}

export default useStopLossExecute