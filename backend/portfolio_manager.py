import pandas as pd

class PortfolioManager:
    """Handles position sizing and portfolio heat/risk limits."""
    
    def __init__(self, max_portfolio_heat: float = 1.0, max_positions: int = 15, max_sector_exposure: float = 0.3):
        self.max_portfolio_heat = max_portfolio_heat
        self.max_positions = max_positions
        self.max_sector_exposure = max_sector_exposure

    @staticmethod
    def calculate_position_size(
        account_size: float, 
        entry_price: float, 
        stoploss_price: float, 
        win_rate: float = 0.55, 
        reward_risk_ratio: float = 2.0,
        max_risk_pct: float = 0.02
    ) -> dict:
        """
        Calculates position size using Half-Kelly criterion, capped at max_risk_pct per trade.
        """
        if win_rate <= 0 or reward_risk_ratio <= 0:
            kelly_pct = 0
        else:
            kelly_pct = win_rate - ((1 - win_rate) / reward_risk_ratio)
            
        half_kelly = max(0.0, kelly_pct / 2.0)
        risk_pct = min(half_kelly, max_risk_pct)
        if risk_pct == 0:
            risk_pct = max_risk_pct # fallback to fixed fractional if Kelly is 0
            
        risk_amount = account_size * risk_pct
        risk_per_share = entry_price - stoploss_price
        
        if risk_per_share <= 0:
            shares = 0
        else:
            shares = int(risk_amount / risk_per_share)
            
        total_cost = shares * entry_price
        
        # Cap to avoid margin
        if total_cost > account_size * 0.15:
            shares = int((account_size * 0.15) / entry_price)
            total_cost = shares * entry_price
            
        return {
            "risk_pct": round(risk_pct * 100, 2),
            "shares": shares,
            "total_cost": round(total_cost, 2)
        }

    def check_portfolio_heat(self, open_positions: list, new_sector: str = None) -> dict:
        """
        Checks if adding a new position violates portfolio constraints.
        open_positions: list of dicts with 'sector' and 'cost_basis'
        """
        if len(open_positions) >= self.max_positions:
            return {"allowed": False, "reason": "Max positions reached"}
            
        # Add basic sector exposure check
        if new_sector and new_sector != "Other":
            sector_count = sum(1 for p in open_positions if p.get('sector') == new_sector)
            if sector_count >= (self.max_positions * self.max_sector_exposure):
                return {"allowed": False, "reason": f"Max sector exposure reached for {new_sector}"}
                
        return {"allowed": True, "reason": "OK"}
