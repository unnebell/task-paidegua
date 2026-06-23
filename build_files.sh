#!/bin/bash
echo "Creating virtual environment..."
python3.12 -m venv venv_build
source venv_build/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Running database migrations..."
python3.12 manage.py migrate --noinput

echo "Collecting static files..."
python3.12 manage.py collectstatic --noinput --clear

echo "Deactivating virtual environment..."
deactivate
