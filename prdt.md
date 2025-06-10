Okay, let's analyze the `createProduct` endpoint and then provide comprehensive documentation for it.

### Analysis of `createProduct` Endpoint

The `createProduct` endpoint is defined in `product-service/src/api/routes/product.routes.ts` and handled by `product-service/src/api/controllers/product.controller.ts` which then uses `product-service/src/services/product.service.ts`.

**Route:**
*   **Method:** `POST`
*   **Path:** `/api/products`

**Middleware:**
*   `authenticate`: Ensures the user is logged in. The `userId` is extracted from the JWT and available in `req.user.id`.
*   `upload.array('images', 10)`: This middleware handles file uploads. It expects a `multipart/form-data` request.
    *   It looks for a field named `images`.
    *   It accepts up to 10 image files for this field.
    *   The uploaded files will be available in `req.files`.

**Controller (`productController.createProduct`):**
*   Extracts `name`, `category`, `subcategory`, `description`, `price` from `req.body`.
*   Retrieves the array of uploaded image files from `req.files`.
*   Gets the `userId` from `req.user.id` (which is populated by the `authenticate` middleware).
*   Performs basic validation: `name`, `category`, `description`, and `price` are required.
*   Converts `price` to a floating-point number.
*   Calls `productService.createProduct` with the product data and the `imageFiles`.

**Service (`productService.createProduct`):**
*   Receives `productData` (excluding `images`) and the `imageFiles` array.
*   **Image Handling:**
    *   If `imageFiles` are provided, it iterates through each file.
    *   For each `file`, it calls `settingsServiceClient.uploadFile` to upload the raw `buffer` to the `settings-service`. The target folder is hardcoded as `'product-docs'`.
    *   It collects the `fileId` and constructs a proxy `url` (e.g., `/settings/files/fileId`) for each uploaded image.
*   Sets default values for new products: `overallRating: 0`, `ratings: []`, `status: ProductStatus.PENDING`.
*   Saves the complete product data (including the `images` array with `url` and `fileId`) to the database via `productRepository.create`.
*   Augments the created product with a `whatsappLink` (by fetching the user's phone number from `user-service`) before returning.

### Documentation for `POST /api/products`

Here's the documentation for creating a product, suitable for a `.md` file:

---

# Endpoint: Create a New Product

Allows an authenticated user to create a new product listing, including uploading associated images.

---

## `POST /api/products`

### Description

This endpoint facilitates the creation of a new product entry in the system. It requires user authentication and supports multi-part form data for product details and image uploads. Upon creation, the product's status will be set to `PENDING` by default, awaiting review (if applicable).

### Authentication

*   **Required:** Yes
*   **Mechanism:** JWT (JSON Web Token) provided in the `Authorization` header as a Bearer token.
    *   Example: `Authorization: Bearer <your_jwt_token>`

### Request

This endpoint expects a `multipart/form-data` request body, as it handles both text fields and file uploads.

#### Headers

*   `Content-Type`: `multipart/form-data`
*   `Authorization`: `Bearer <your_jwt_token>`

#### Body (Form Data)

| Field Name    | Type             | Required | Description                                                                 | Example Value                       |
| :------------ | :--------------- | :------- | :-------------------------------------------------------------------------- | :---------------------------------- |
| `name`        | `string`         | Yes      | The name of the product.                                                    | `"Smartphone Samsung Galaxy S23"`   |
| `category`    | `string`         | Yes      | The main category the product belongs to.                                   | `"Electronics"`                     |
| `subcategory` | `string`         | Yes      | The subcategory of the product within its main category.                    | `"Mobile Phones"`                   |
| `description` | `string`         | Yes      | A detailed description of the product.                                      | `"Brand new, sealed in box..."`     |
| `price`       | `number` (float) | Yes      | The selling price of the product.                                           | `1200.50`                           |
| `images`      | `file` (`.jpg`, `.png`, etc.) | No       | Up to 10 image files for the product. Send as `type="file"` input. | `(Select multiple files)`           |

**Note:** The `userId` is automatically extracted from the authenticated user's token and associated with the product.

### Response

#### Success (HTTP 201 Created)

```json
{
  "success": true,
  "data": {
    "_id": "65b9d3e8e2b8c9d0e1f2a3b4",
    "userId": "65b9d3e8e2b8c9d0e1f2a3b5",
    "name": "Smartphone Samsung Galaxy S23",
    "category": "electronics",
    "subcategory": "mobile phones",
    "description": "Brand new, sealed in box with 2 years warranty. Fast processor, amazing camera.",
    "images": [
      {
        "fileId": "some-unique-file-id-1",
        "url": "/settings/files/some-unique-file-id-1"
      },
      {
        "fileId": "some-unique-file-id-2",
        "url": "/settings/files/some-unique-file-id-2"
      }
    ],
    "price": 1200.5,
    "ratings": [],
    "overallRating": 0,
    "status": "pending",
    "deleted": false,
    "createdAt": "2024-01-31T10:00:00.000Z",
    "updatedAt": "2024-01-31T10:00:00.000Z",
    "whatsappLink": "https://wa.me/237677123456"
  }
}
```

#### Error Responses

| HTTP Status | Message                                                  | Description                                                 |
| :---------- | :------------------------------------------------------- | :---------------------------------------------------------- |
| `400 Bad Request` | `Missing required fields: name, category, description, price` | One or more mandatory fields are missing.                   |
| `400 Bad Request` | `Price must be a number` (if validation added)           | The provided price is not a valid number.                   |
| `401 Unauthorized`| `User not authenticated`                                 | No JWT token provided or token is invalid/expired.          |
| `500 Internal Server Error` | `Failed to create product`                       | An unexpected error occurred on the server side. Check logs. |

### Example `curl` Command

```bash
curl -X POST \
  http://localhost:3000/api/products \
  -H 'Authorization: Bearer <your_jwt_token>' \
  -H 'Content-Type: multipart/form-data' \
  -F 'name=Awesome Widget Pro' \
  -F 'category=Gadgets' \
  -F 'subcategory=Smart Devices' \
  -F 'description=This is the most awesome widget you will ever find. Features AI and blockchain!' \
  -F 'price=99.99' \
  -F 'images=@/path/to/your/image1.jpg' \
  -F 'images=@/path/to/your/image2.png'
```

**Note:** Replace `http://localhost:3000` with your actual API base URL and `/path/to/your/image.jpg` with the actual paths to your image files. You can provide multiple `-F 'images=@file.jpg'` flags for multiple images.

---