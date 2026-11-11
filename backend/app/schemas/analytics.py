from pydantic import BaseModel
from typing import List, Dict, Any

class AdminOverviewStats(BaseModel):
    total_appointments_today: int
    waiting_count: int
    serving_count: int
    completed_count: int
    cancelled_count: int
    avg_waiting_time_minutes: float

class DailyStat(BaseModel):
    date: str
    booked: int
    completed: int
    cancelled: int

class WeeklyStat(BaseModel):
    day: str
    visits: int

class MonthlyStat(BaseModel):
    month: str
    appointments: int

class CategoryPopularity(BaseModel):
    name: str
    count: int

class AdminDashboardAnalytics(BaseModel):
    overview: AdminOverviewStats
    daily_stats: List[DailyStat]
    weekly_visits: List[WeeklyStat]
    monthly_trends: List[MonthlyStat]
    category_popularity: List[CategoryPopularity]
