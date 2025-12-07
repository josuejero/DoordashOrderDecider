# ml-service/tests/test_data_validation.py
import pytest
import pandas as pd
from unittest.mock import MagicMock, patch
import psycopg

from ml_service.data import load_training_data, TRAINING_SQL


def test_training_sql_structure():
    """Test that TRAINING_SQL has the expected structure"""
    assert "fact_orders" in TRAINING_SQL
    assert "fact_decisions" in TRAINING_SQL
    assert "dim_time" in TRAINING_SQL
    assert "dim_zone" in TRAINING_SQL
    assert "effective_hourly_rate" in TRAINING_SQL
    assert "final_decision" in TRAINING_SQL


def test_load_training_data_returns_correct_columns():
    """Test that load_training_data returns DataFrame with expected columns"""
    # Mock data
    mock_data = pd.DataFrame({
        'order_id': [1, 2, 3],
        'platform': ['DoorDash', 'DoorDash', 'DoorDash'],
        'gross_payout': [15.0, 20.0, 25.0],
        'miles': [5.0, 8.0, 12.0],
        'est_minutes': [30.0, 40.0, 50.0],
        'hour_of_day': [10, 14, 18],
        'day_of_week': [1, 3, 5],
        'time_of_day_bucket': ['morning', 'afternoon', 'evening'],
        'zone_name': ['Downtown', 'Suburbs', 'Downtown'],
        'label_hourly': [30.0, 30.0, 30.0],
        'final_decision': ['ACCEPT', 'ACCEPT', 'REJECT']
    })
    
    with patch('psycopg.connect') as mock_connect:
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_connect.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        
        # Mock pandas read_sql_query
        with patch('pandas.read_sql_query', return_value=mock_data) as mock_read_sql:
            X, y = load_training_data("postgresql://test:test@localhost:5432/testdb")
            
            # Check feature columns
            expected_features = [
                "gross_payout",
                "miles",
                "est_minutes",
                "hour_of_day",
                "day_of_week",
            ]
            
            for col in expected_features:
                assert col in X.columns
            
            # Check label
            assert y.name == "label_hourly"
            assert len(X) == 3
            assert len(y) == 3


def test_load_training_data_handles_missing_labels():
    """Test that rows without label_hourly are dropped"""
    mock_data = pd.DataFrame({
        'gross_payout': [15.0, 20.0, 25.0],
        'miles': [5.0, 8.0, 12.0],
        'est_minutes': [30.0, 40.0, 50.0],
        'hour_of_day': [10, 14, 18],
        'day_of_week': [1, 3, 5],
        'label_hourly': [30.0, None, 30.0],  # One missing label
        'final_decision': ['ACCEPT', 'ACCEPT', 'REJECT']
    })
    
    with patch('psycopg.connect'):
        with patch('pandas.read_sql_query', return_value=mock_data):
            X, y = load_training_data("dummy_conn_str")
            
            # Should drop the row with None label
            assert len(X) == 2
            assert len(y) == 2
            assert y.isna().sum() == 0


def test_load_training_data_fills_missing_values():
    """Test that missing feature values are filled with 0.0"""
    mock_data = pd.DataFrame({
        'gross_payout': [15.0, None, 25.0],
        'miles': [5.0, 8.0, None],
        'est_minutes': [30.0, 40.0, 50.0],
        'hour_of_day': [10, 14, 18],
        'day_of_week': [1, 3, 5],
        'label_hourly': [30.0, 30.0, 30.0],
        'final_decision': ['ACCEPT', 'ACCEPT', 'REJECT']
    })
    
    with patch('psycopg.connect'):
        with patch('pandas.read_sql_query', return_value=mock_data):
            X, y = load_training_data("dummy_conn_str")
            
            # Check that NaN values are filled
            assert X.isna().sum().sum() == 0
            assert X['gross_payout'].iloc[1] == 0.0  # Was None, should be filled to 0.0
            assert X['miles'].iloc[2] == 0.0  # Was None, should be filled to 0.0


def test_training_data_minimum_rows():
    """Integration test to ensure we have enough training data"""
    # This test would run against a real test database
    # For now, we'll create a skip marker
    pytest.skip("Requires seeded test database with analytics data")
    
    # Uncomment and run when you have a test database set up:
    # conn_str = "postgresql://test:test@localhost:5432/doordash_decider_test"
    # X, y = load_training_data(conn_str)
    # 
    # # We should have at least some data for training
    # assert len(X) >= 10, f"Need at least 10 training samples, got {len(X)}"
    # 
    # # Check data distribution
    # assert 'label_hourly' in y.name
    # assert y.min() >= 0, "Hourly rate should be non-negative"
    # 
    # # Check feature ranges are reasonable
    # assert X['gross_payout'].max() <= 100, "Payouts over $100 are suspicious"
    # assert X['miles'].max() <= 50, "Trips over 50 miles are suspicious"
    # assert X['est_minutes'].max() <= 180, "Trips over 3 hours are suspicious"
