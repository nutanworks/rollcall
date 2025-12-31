// using global fetch (Node 18+)

const BASE_URL = 'http://localhost:5000/api';
const ADMIN_EMAIL = 'nutan123@gmail.com';
const ADMIN_PASS = 'Admin@123';

async function testBackend() {
    console.log('--- Starting Backend API Tests ---');
    let success = true;

    // 1. Test Login
    try {
        console.log('\n[TEST 1] Testing Admin Login...');
        const loginRes = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: ADMIN_EMAIL,
                password: ADMIN_PASS,
                role: 'ADMIN'
            })
        });

        if (loginRes.status === 200) {
            const data = await loginRes.json();
            console.log('✅ Login Successful');
            console.log(`   User: ${data.name} (${data.email})`);
        } else {
            console.error('❌ Login Failed');
            console.error(`   Status: ${loginRes.status}`);
            console.error('   Response:', await loginRes.text());
            success = false;
        }
    } catch (error) {
        console.error('❌ Login Error:', error.message);
        success = false;
    }

    // 2. Test Get Users
    try {
        console.log('\n[TEST 2] Fetching All Users...');
        const usersRes = await fetch(`${BASE_URL}/users`);
        if (usersRes.status === 200) {
            const users = await usersRes.json();
            console.log(`✅ Fetch Users Successful. Count: ${users.length}`);
            if (users.length > 0) {
                console.log(`   Sample User: ${users[0].name}`);
            }
        } else {
            console.error('❌ Fetch Users Failed');
            success = false;
        }
    } catch (error) {
        console.error('❌ Fetch Users Error:', error.message);
        success = false;
    }

    // 3. Test Invalid Login
    try {
        console.log('\n[TEST 3] Testing Invalid Login...');
        const failRes = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: ADMIN_EMAIL,
                password: 'WrongPassword',
                role: 'ADMIN'
            })
        });

        if (failRes.status === 401) {
            console.log('✅ Invalid Login correctly rejected (401)');
        } else {
            console.error('❌ Invalid Login SHOULD fail but got:', failRes.status);
            success = false;
        }
    } catch (error) {
        console.error('❌ Login Error:', error.message);
        success = false;
    }

    console.log('\n--- Test Summary ---');
    if (success) {
        console.log('✅ ALL BACKEND TESTS PASSED');
    } else {
        console.log('❌ SOME TESTS FAILED');
    }
}

testBackend();
