import http.client
import json

def test_api():
    conn = http.client.HTTPConnection("localhost", 8000, timeout=15)
    
    # 1. Login
    payload = json.dumps({"email": "admin@hrms.com", "password": "admin123"})
    headers = {"Content-Type": "application/json"}
    
    try:
        print("Logging in...")
        conn.request("POST", "/api/auth/login", body=payload, headers=headers)
        res = conn.getresponse()
        data = res.read().decode()
        if res.status == 200:
            token = json.loads(data)["access_token"]
            print(f"Login successful. Token: {token[:15]}...")
            
            # 2. Get Users
            print("Getting users...")
            headers = {"Authorization": f"Bearer {token}"}
            conn.request("GET", "/api/users", headers=headers)
            res2 = conn.getresponse()
            print(f"Users Status: {res2.status}")
            print(f"Users Data: {res2.read().decode()}")
        else:
            print(f"Login error: {res.status} - {data}")
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    test_api()
