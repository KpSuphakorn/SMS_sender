from app.models.sender_names import sender_names_collection

def create_indexes():
    sender_names_collection().create_index([("sender_name", 1), ("phone_number", 1)])
    sender_names_collection().create_index([("request_id", 1)])
    print("Created indexes for sender_names_collection")

if __name__ == "__main__":
    create_indexes()