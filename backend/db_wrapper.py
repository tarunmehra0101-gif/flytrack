import os
import uuid
from typing import Optional, List, Dict, Any

class MockCollection:
    def __init__(self, supabase, table_name):
        self.supabase = supabase
        self.table = table_name

    async def find_one(self, query: dict, projection: Optional[dict] = None) -> Optional[dict]:
        req = self.supabase.table(self.table).select("*")
        for k, v in query.items():
            if k == "_id": continue
            if isinstance(v, dict):
                if "$regex" in v:
                    req = req.ilike(k, f"%{v['$regex']}%")
                elif "$in" in v:
                    req = req.in_(k, v["$in"])
                elif "$ne" in v:
                    req = req.neq(k, v["$ne"])
            else:
                req = req.eq(k, v)
        res = req.limit(1).execute()
        return res.data[0] if res.data else None

    async def insert_one(self, doc: dict) -> None:
        doc = {k: v for k, v in doc.items() if k != "_id"}
        self.supabase.table(self.table).insert(doc).execute()

    async def insert_many(self, docs: List[dict]) -> None:
        if not docs: return
        clean_docs = [{k: v for k, v in doc.items() if k != "_id"} for doc in docs]
        self.supabase.table(self.table).insert(clean_docs).execute()

    async def update_one(self, query: dict, update: dict, upsert: bool = False) -> Any:
        req = self.supabase.table(self.table)
        
        # Build update payload
        updates = {}
        if "$set" in update:
            updates.update(update["$set"])
        if "$setOnInsert" in update:
            updates.update(update["$setOnInsert"])
            
        if not updates:
            return type('obj', (object,), {'matched_count': 0})()

        # Build query
        filter_req = req.update(updates)
        for k, v in query.items():
            if k == "_id": continue
            filter_req = filter_req.eq(k, v)
            
        res = filter_req.execute()
        matched = len(res.data) if res.data else 0
        
        if matched == 0 and upsert:
            # We must upsert.
            doc = {**query}
            if "$set" in update: doc.update(update["$set"])
            if "$setOnInsert" in update: doc.update(update["$setOnInsert"])
            doc = {k: v for k, v in doc.items() if k != "_id"}
            self.supabase.table(self.table).insert(doc).execute()
            matched = 1
            
        return type('obj', (object,), {'matched_count': matched})()

    async def update_many(self, query: dict, update: dict) -> None:
        req = self.supabase.table(self.table)
        updates = update.get("$set", {})
        if not updates: return
        
        filter_req = req.update(updates)
        for k, v in query.items():
            if k == "_id": continue
            if isinstance(v, dict) and "$in" in v:
                filter_req = filter_req.in_(k, v["$in"])
            else:
                filter_req = filter_req.eq(k, v)
        filter_req.execute()

    async def delete_one(self, query: dict) -> None:
        req = self.supabase.table(self.table).delete()
        for k, v in query.items():
            if k == "_id": continue
            req = req.eq(k, v)
        req.execute()

    async def delete_many(self, query: dict) -> None:
        req = self.supabase.table(self.table).delete()
        for k, v in query.items():
            if k == "_id": continue
            req = req.eq(k, v)
        req.execute()

    def find(self, query: dict, projection: Optional[dict] = None) -> 'MockCursor':
        return MockCursor(self.supabase, self.table, query)


class MockCursor:
    def __init__(self, supabase, table, query):
        self.supabase = supabase
        self.table = table
        self.query = query
        self.order_by = None
        
    def sort(self, field: str, direction: int):
        self.order_by = (field, direction == -1)
        return self

    async def to_list(self, length: int) -> List[dict]:
        req = self.supabase.table(self.table).select("*")
        for k, v in self.query.items():
            if k == "_id": continue
            if isinstance(v, dict) and "$in" in v:
                req = req.in_(k, v["$in"])
            else:
                req = req.eq(k, v)
                
        if self.order_by:
            req = req.order(self.order_by[0], desc=self.order_by[1])
            
        req = req.limit(length)
        res = req.execute()
        return res.data if res.data else []


class SupabaseDBWrapper:
    def __init__(self, supabase):
        self.supabase = supabase
        # Map MongoDB collections to Supabase tables
        self.user_profiles = MockCollection(supabase, "profiles")
        self.artifacts = MockCollection(supabase, "ticket_artifacts")
        
        # Both segments map to flights
        self.parsed_segments = MockCollection(supabase, "flights")
        self.confirmed_segments = MockCollection(supabase, "flights")
        
        # For trips, city_stays, monthly_stats, we will just use dummy collections 
        # since _recompute_for_user handles writes to analytics_snapshots, and read endpoints 
        # will be rewritten to read from analytics_snapshots directly!
        self.trips = MockCollection(supabase, "dummy_trips")
        self.city_stays = MockCollection(supabase, "dummy_stays")
        self.monthly_stats = MockCollection(supabase, "dummy_monthly")
