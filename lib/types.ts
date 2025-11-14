export type User = {
  id: string
  x_username: string
  wallet_address: string
  pnl_percent: number
  total_profit_usd: number
  total_trades: number
  followers_count: number
  last_trade_timestamp: string | null
  active: boolean
  created_at: string
}

export type Trade = {
  id: string
  user_id: string
  token_symbol: string
  token_address: string
  amount_usd: number
  profit_loss_usd: number
  timestamp: string
}

