from db import engine, Base, SessionLocal
from models import User, Product, Order

def init_db():
    # Always start fresh (Ephemeral DB)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Create dummy users
    if True: # Always seed
        u1 = User(name="Alice Smith", email="alice@example.com")
        u2 = User(name="Bob Jones", email="bob@example.com")
        u3 = User(name="Charlie Brown", email="charlie@example.com")
        
        # Create dummy products
        p1 = Product(name="Laptop", price=1200.00)
        p2 = Product(name="Smartphone", price=800.00)
        p3 = Product(name="Headphones", price=150.00)
        p4 = Product(name="Monitor", price=300.00)
        
        db.add_all([u1, u2, u3, p1, p2, p3, p4])
        db.commit()
        
        # Create dummy orders
        o1 = Order(user_id=1, product_id=1, quantity=1, total_amount=1200.00)
        o2 = Order(user_id=1, product_id=3, quantity=2, total_amount=300.00)
        o3 = Order(user_id=2, product_id=2, quantity=1, total_amount=800.00)
        o4 = Order(user_id=3, product_id=4, quantity=1, total_amount=300.00)
        
        db.add_all([o1, o2, o3, o4])
        db.commit()
    
    db.close()

if __name__ == "__main__":
    init_db()
