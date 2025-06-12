from pydantic import BaseModel
from typing import List, Dict

class SenderRequest(BaseModel):
    fields: List[str]
    rows: List[Dict]