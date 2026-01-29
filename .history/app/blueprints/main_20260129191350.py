
from flask import Blueprint, render_template

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    return render_template('public/index.html')

@main_bp.route('/privacy.html') # Serve for legacy compatibility or direct link
def privacy():
    return render_template('public/privacy.html')
