def make_admin(username):
    from app.db.session import SessionLocal
    from app.models.user import User, UserRole
    db = SessionLocal()
    db_user = db.query(User).filter_by(username=username).first()
    db_user.role = UserRole.ADMIN
    db.commit()
    db.close()