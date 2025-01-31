import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { STOP_LIMIT_ORDER_ADDRESS } from '@sushiswap/limit-order-sdk'
import Typography from 'app/components/Typography'
import { Feature } from 'app/enums'
import LimitOrderApprovalCheck from 'app/features/legacy/limit-order/LimitOrderApprovalCheck'
import useLimitOrders from 'app/features/legacy/limit-order/useLimitOrders'
import DiscoverHeader from 'app/features/stop-loss/DiscoverHeader'
import OpenOrders from 'app/features/stop-loss/OpenOrders'
import OrdersTableToggle from 'app/features/stop-loss/OrderTableToggle'
import NetworkGuard from 'app/guards/Network'
import { TridentBody } from 'app/layouts/Trident'
import { useActiveWeb3React } from 'app/services/web3'
import { useBentoMasterContractAllowed } from 'app/state/bentobox/hooks'
import React from 'react'

function OpenOrdersPage() {
  const { chainId, account } = useActiveWeb3React()
  const { i18n } = useLingui()
  const { pending } = useLimitOrders()
  const masterContract = chainId ? STOP_LIMIT_ORDER_ADDRESS[chainId] : undefined
  const allowed = useBentoMasterContractAllowed(masterContract, account ?? undefined)

  return (
    <>
      <LimitOrderApprovalCheck />
      <DiscoverHeader />
      <TridentBody>
        {pending.totalOrders > 0 && typeof allowed !== 'undefined' && !allowed && (
          <div className="border border-yellow/40 rounded p-4">
            <Typography variant="sm" className="text-yellow">
              {i18n._(t`It seems like you have open orders while the limit order master contract is not yet approved. Please make
          sure you have approved the limit order master contract or the order will not execute`)}
            </Typography>
          </div>
        )}
        <OrdersTableToggle />
        <OpenOrders />
      </TridentBody>
    </>
  )
}

OpenOrdersPage.Guard = NetworkGuard(Feature.LIMIT_ORDERS)

export default OpenOrdersPage
