import os
import pymongo
from dotenv import load_dotenv

load_dotenv("/Users/kumarlouhit/Documents/flytrack-main/backend/.env")

mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
db_name = os.environ.get("DB_NAME", "travel_ledger")

client = pymongo.MongoClient(mongo_url)
db = client[db_name]

print("DB Name:", db_name)
print("Collections:", db.list_collection_names())

# Users
print("\n--- Users ---")
for u in db.users.find():
    print(u)

# Profiles
print("\n--- User Profiles ---")
for p in db.user_profiles.find():
    print(p)

# Confirmed segments count per user
print("\n--- Confirmed Segments count per user ---")
for row in db.confirmed_segments.aggregate([
    {"$group": {"_id": {"user_id": "$user_id", "status": "$status"}, "count": {"$sum": 1}}}
]):
    print(row)

# Parsed segments count per user
print("\n--- Parsed Segments count per user ---")
for row in db.parsed_segments.aggregate([
    {"$group": {"_id": {"user_id": "$user_id", "status": "$status"}, "count": {"$sum": 1}}}
]):
    print(row)

# Show confirmed segments for user kr.lauhit@gmail.com (or whatever email)
target_user = db.users.find_one({"email": {"$regex": "lauhit", "$options": "i"}})
if target_user:
    user_id = target_user["user_id"]
    print(f"\n--- Confirmed Segments for {target_user['email']} ({user_id}) ---")
    for s in db.confirmed_segments.find({"user_id": user_id}):
        print(s.get("id"), s.get("departure_airport_iata"), s.get("arrival_airport_iata"), s.get("flight_date"), s.get("status"), s.get("canonical_hash"))
    print(f"\n--- Parsed Segments for {target_user['email']} ({user_id}) ---")
    for s in db.parsed_segments.find({"user_id": user_id}):
        print(s.get("id"), s.get("departure_airport_iata"), s.get("arrival_airport_iata"), s.get("flight_date"), s.get("status"))
else:
    print("\nNo user matching 'lauhit' found.")
