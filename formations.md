## How to Get Formations for the Frontend

This document explains how to retrieve the "formations" data from the `settings-service` API to display it on your frontend application.

### API Endpoint Details

*   **Endpoint:** `/settings/formations`
*   **Method:** `GET`
*   **Authentication:** This endpoint requires authentication. You should include a valid JWT (JSON Web Token) in the `Authorization` header. The token is typically obtained after a successful user login.

### Request

There are no query parameters or request body required for this `GET` request.

**Example Request (using `fetch` in JavaScript):**

```javascript
const API_BASE_URL = 'http://localhost:your-service-port/api/v1/settings'; // Replace with your actual service URL and port
const authToken = 'YOUR_JWT_TOKEN'; // Replace with the actual JWT token

async function getFormations() {
    try {
        const response = await fetch(`${API_BASE_URL}/formations`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}` // Include your JWT token
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to fetch formations:', errorData.message);
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Formations data:', data.data);
        return data.data; // This will be an array of formation objects
    } catch (error) {
        console.error('Error getting formations:', error);
        return null;
    }
}

// Example usage:
getFormations().then(formations => {
    if (formations) {
        // Render your formations on the frontend
        formations.forEach(formation => {
            console.log(`Title: ${formation.title}, Link: ${formation.link}, ID: ${formation._id}`);
            // Example: Append to a list in your HTML
            // const ul = document.getElementById('formations-list');
            // const li = document.createElement('li');
            // li.innerHTML = `<a href="${formation.link}">${formation.title}</a>`;
            // ul.appendChild(li);
        });
    } else {
        console.log('No formations found or an error occurred.');
    }
});
```

**Example Request (using `axios` in JavaScript/TypeScript):**

If you are using `axios`, the request would look like this:

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:your-service-port/api/v1/settings'; // Replace with your actual service URL and port
const authToken = 'YOUR_JWT_TOKEN'; // Replace with the actual JWT token

async function getFormationsAxios() {
    try {
        const response = await axios.get(`${API_BASE_URL}/formations`, {
            headers: {
                'Authorization': `Bearer ${authToken}` // Include your JWT token
            }
        });

        console.log('Formations data (axios):', response.data.data);
        return response.data.data; // This will be an array of formation objects
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Failed to fetch formations:', error.response?.data?.message || error.message);
        } else {
            console.error('Error getting formations:', error);
        }
        return null;
    }
}

// Example usage:
getFormationsAxios().then(formations => {
    if (formations) {
        // Process formations data
    }
});
```

### Expected Response

A successful response will have a `200 OK` status code and a JSON body containing a `data` array with formation objects.

```json
{
    "success": true,
    "data": [
        {
            "_id": "65b7a1b0e9f1a0f9e1b2c3d4", // Unique ID for the formation
            "title": "Introduction to Node.js",
            "link": "https://example.com/nodejs-intro"
        },
        {
            "_id": "65b7a1b0e9f1a0f9e1b2c3d5",
            "title": "Advanced Microservices Architecture",
            "link": "https://example.com/microservices-advanced"
        }
    ],
    "message": "Formations retrieved successfully"
}
```

**Error Response Examples:**

*   **401 Unauthorized:** If no token or an invalid token is provided.
    ```json
    {
        "success": false,
        "message": "Unauthorized: No token provided"
    }
    ```
*   **500 Internal Server Error:** If a server-side error occurs during retrieval.
    ```json
    {
        "success": false,
        "message": "Failed to retrieve formations",
        "errors": [] // Optional: More detailed error info
    }
    ```

### Important Notes

*   **Replace Placeholders:** Remember to replace `http://localhost:your-service-port/api/v1/settings` with the actual base URL of your `settings-service` API, and `YOUR_JWT_TOKEN` with a valid authentication token.
*   **Error Handling:** Always implement robust error handling in your frontend to gracefully manage API failures.
*   **Caching:** Consider client-side caching strategies if the formations data is not expected to change frequently, to improve performance.