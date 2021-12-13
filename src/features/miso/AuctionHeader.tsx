import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { Token } from '@sushiswap/core-sdk'
import Chip from 'app/components/Chip'
import Typography from 'app/components/Typography'
import AuctionTimer from 'app/features/miso/AuctionTimer'
import { Auction } from 'app/features/miso/context/Auction'
import { AuctionStatus } from 'app/features/miso/context/types'
import { AuctionStatusById } from 'app/features/miso/context/utils'
import { classNames } from 'app/functions'
import React, { FC } from 'react'

interface AuctionHeaderProps {
  auction: Auction<Token, Token>
}
const AuctionHeader: FC<AuctionHeaderProps> = ({ auction }) => {
  const { i18n } = useLingui()

  return (
    <div className="grid grid-cols-3 items-end">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Typography weight={700} className="text-secondary">
            {auction.auctionToken.symbol}
          </Typography>
          {auction && (
            <Chip
              size="sm"
              color={
                auction.status === AuctionStatus.LIVE
                  ? 'green'
                  : auction.status === AuctionStatus.UPCOMING
                  ? 'blue'
                  : 'pink'
              }
              label={AuctionStatusById(i18n)[auction.status]}
            />
          )}
        </div>

        <Typography variant="h2" weight={700} className="text-high-emphesis">
          {auction.auctionToken.name}
        </Typography>
      </div>
      <AuctionTimer auction={auction}>
        {({ days, hours, minutes, seconds }) => {
          return (
            <div className="grid grid-cols-7 rounded">
              <div className="col-span-7 mb-3">
                <Typography
                  weight={700}
                  className={classNames(
                    auction.status === AuctionStatus.UPCOMING
                      ? 'text-blue'
                      : auction.status === AuctionStatus.LIVE
                      ? 'text-green'
                      : 'text-pink',
                    'tracking-[0.3em] text-center'
                  )}
                >
                  {auction.status === AuctionStatus.UPCOMING
                    ? i18n._(t`SALE STARTS IN`)
                    : auction.status === AuctionStatus.LIVE
                    ? i18n._(t`SALE LIVE`)
                    : i18n._(t`SALE FINISHED`)}
                </Typography>
              </div>
              <Typography variant="h3" weight={700} className="text-mono text-white text-center">
                {days}
              </Typography>
              <Typography variant="lg" className="text-mono text-low-emphesis text-center">
                :
              </Typography>
              <Typography variant="h3" weight={700} className="text-mono text-white text-center">
                {hours}
              </Typography>
              <Typography variant="lg" className="text-mono text-low-emphesis text-center">
                :
              </Typography>
              <Typography variant="h3" weight={700} className="text-mono text-white text-center">
                {minutes}
              </Typography>
              <Typography variant="lg" className="text-mono text-low-emphesis text-center">
                :
              </Typography>
              <Typography variant="h3" weight={700} className="text-mono text-white text-center">
                {seconds}
              </Typography>
              <Typography variant="xs" weight={700} className="text-low-emphesis text-mono text-center mt-1">
                {i18n._(t`Days`)}
              </Typography>
              <div />
              <Typography variant="xs" weight={700} className="text-low-emphesis text-mono text-center mt-1">
                {i18n._(t`Hours`)}
              </Typography>
              <div />
              <Typography variant="xs" weight={700} className="text-low-emphesis text-mono text-center mt-1">
                {i18n._(t`Minutes`)}
              </Typography>
              <div />
              <Typography variant="xs" weight={700} className="text-low-emphesis text-mono text-center mt-1">
                {i18n._(t`Seconds`)}
              </Typography>
            </div>
          )
        }}
      </AuctionTimer>
      <div className="flex gap-5 justify-end">
        <div className="flex flex-col gap-1">
          <Typography weight={700} variant="sm" className="text-secondary">
            {i18n._(t`Current Token Price`)}
          </Typography>
          <div className="flex justify-end items-baseline w-full gap-1">
            <Typography variant="h2" weight={700} className="text-high-emphesis text-right">
              {auction.currentPrice?.toSignificant(6)}
            </Typography>
            <Typography variant="lg" weight={700} className="text-right">
              {auction.currentPrice?.quoteCurrency.symbol}
            </Typography>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuctionHeader
