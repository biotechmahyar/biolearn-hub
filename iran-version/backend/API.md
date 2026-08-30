# NIBRC Iran Backend — API Documentation

Base URL: `http://localhost:3000/api`

All responses follow the shape:
```json
{ "ok": true, "data": <T> }
// or
{ "ok": false, "error": "<message>", "code": "<optional>" }
```

---

## Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login with email + password |
| POST | `/api/auth/refresh` | No | Refresh access token |
| POST | `/api/auth/logout` | No | Logout (client-side) |
| GET | `/api/auth/me` | No | Get current user from Bearer token |
| GET | `/api/auth/is-admin` | No | Check if current user is admin |

### POST /api/auth/register
**Request:**
```json
{ "name": "string", "email": "string", "password": "string (min 6)" }
```
**Response (201):**
```json
{ "ok": true, "data": { "user": { "id", "name", "email", "role" }, "accessToken", "refreshToken" } }
```

### POST /api/auth/login
**Request:**
```json
{ "email": "string", "password": "string" }
```
**Response (200):**
```json
{ "ok": true, "data": { "user": { "id", "name", "email", "role" }, "accessToken", "refreshToken" } }
```

### POST /api/auth/refresh
**Request:**
```json
{ "refreshToken": "string" }
```
**Response (200):**
```json
{ "ok": true, "data": { "accessToken", "refreshToken" } }
```

### GET /api/auth/me
**Header:** `Authorization: Bearer <token>`
**Response (200):**
```json
{ "ok": true, "data": { "id", "name", "email", "role", "secondaryRole", "firstName", "lastName", "about", "avatarUrl", "university", "major" } }
```

### GET /api/auth/is-admin
**Header:** `Authorization: Bearer <token>`
**Response (200):** `true` or `false`

---

## Public Content (No Auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/content/categories` | List all categories |
| GET | `/api/content/categories/:slug` | Get category by slug |
| POST | `/api/content/categories` | Create category (instructor/admin) |
| GET | `/api/content/courses` | List published courses |
| GET | `/api/content/courses/:slug` | Get course by slug |
| GET | `/api/content/instructors` | List all instructors |
| GET | `/api/content/instructors/:slug` | Get instructor by slug |
| GET | `/api/content/articles` | List published articles |
| GET | `/api/content/articles/:slug` | Get article by slug |
| GET | `/api/content/products` | List published products |
| GET | `/api/content/products/:slug` | Get product by slug |
| GET | `/api/content/workshops` | List published workshops |
| GET | `/api/content/workshops/:slug` | Get workshop by slug |
| GET | `/api/content/testimonials` | List testimonials |

### Query Parameters

**GET /api/content/courses**
| Param | Type | Description |
|-------|------|-------------|
| `categorySlug` | string | Filter by category |
| `search` | string | Search in title/summary |
| `featuredOnly` | boolean | Only featured |
| `popularOnly` | boolean | Only popular |
| `limit` | number | Max results |

**GET /api/content/articles**
| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by category |
| `limit` | number | Max results |

---

## User Profile (Auth Required)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/me` | Yes | Get my profile |
| PUT | `/api/users/me` | Yes | Update my profile |

### PUT /api/users/me
**Request:**
```json
{ "firstName": "string?", "lastName": "string?", "avatarUrl": "string?", "about": "string?" }
```

---

## Admin (Content Staff Required)

**Header:** `Authorization: Bearer <admin-token>`

### Courses

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/courses` | List all courses |
| POST | `/api/admin/courses` | Create course |
| PUT | `/api/admin/courses/:id` | Update course |
| DELETE | `/api/admin/courses/:id` | Delete course |
| PATCH | `/api/admin/courses/:id/toggle-publish` | Toggle publish state |

**POST /api/admin/courses — Request:**
```json
{
  "title": "string",
  "slug": "string (auto-generated if empty)",
  "categoryId": "uuid",
  "instructorId": "uuid",
  "summary": "string",
  "price": number,
  "mode": "live" | "recorded" | "hybrid",
  "bundle": "economy" | "basic" | "plus" | "premium",
  "published": boolean,
  "audience": ["string"]?,
  "prerequisites": ["string"]?,
  "syllabus": [{ "title": "string", "durationMin": number, "free": boolean }]?,
  "packagePrices": [{ "tier": "string", "price": number, "features": ["string"] }]?
}
```

### Articles

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/articles` | List all articles |
| POST | `/api/admin/articles` | Create article |
| PUT | `/api/admin/articles/:id` | Update article |
| DELETE | `/api/admin/articles/:id` | Delete article |

### Products

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/products` | List all products |
| POST | `/api/admin/products` | Create product |
| PUT | `/api/admin/products/:id` | Update product |
| DELETE | `/api/admin/products/:id` | Delete product |

### Workshops

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/workshops` | List all workshops |
| POST | `/api/admin/workshops` | Create workshop |
| PUT | `/api/admin/workshops/:id` | Update workshop |
| DELETE | `/api/admin/workshops/:id` | Delete workshop |

### Instructors

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/instructors` | List all instructors |
| POST | `/api/admin/instructors` | Create instructor |
| PUT | `/api/admin/instructors/:id` | Update instructor |
| DELETE | `/api/admin/instructors/:id` | Delete instructor |

### Categories (Admin)

| Method | Path | Description |
|--------|------|-------------|
| PUT | `/api/admin/categories/:id` | Update category |
| DELETE | `/api/admin/categories/:id` | Delete category |

### Users & Roles

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List all users |
| PUT | `/api/admin/users/:id/role` | Set user role |
| PUT | `/api/admin/users/:id/secondary-role` | Set secondary role |
| DELETE | `/api/admin/users/:id` | Delete user |

### Profile Approval

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/profiles/pending` | List pending profile edits |
| POST | `/api/admin/profiles/:id/approve` | Approve profile |
| POST | `/api/admin/profiles/:id/reject` | Reject profile |

---

## Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server health |
| GET | `/api/health/db` | Database connectivity |

---

## Migration Summary

### Queries Migrated (15)

| Convex Query | REST Endpoint |
|-------------|---------------|
| `content.listCategories` | `GET /api/content/categories` |
| `content.listCourses` | `GET /api/content/courses` |
| `content.getCourseBySlug` | `GET /api/content/courses/:slug` |
| `content.listInstructors` | `GET /api/content/instructors` |
| `content.getInstructorBySlug` | `GET /api/content/instructors/:slug` |
| `content.listArticles` | `GET /api/content/articles` |
| `content.getArticleBySlug` | `GET /api/content/articles/:slug` |
| `content.listProducts` | `GET /api/content/products` |
| `content.getProductBySlug` | `GET /api/content/products/:slug` |
| `content.listWorkshops` | `GET /api/content/workshops` |
| `content.getWorkshopBySlug` | `GET /api/content/workshops/:slug` |
| `content.listTestimonials` | `GET /api/content/testimonials` |
| `users.currentUser` | `GET /api/auth/me` |
| `admin.amIAdmin` | `GET /api/auth/is-admin` |
| `profiles.getMyProfile` | `GET /api/users/me` |

### Mutations Migrated (28)

| Convex Mutation | REST Endpoint |
|----------------|---------------|
| `content.createCategory` | `POST /api/content/categories` |
| `admin.adminListCourses` | `GET /api/admin/courses` |
| `admin.adminCreateCourse` | `POST /api/admin/courses` |
| `admin.adminUpdateCourse` | `PUT /api/admin/courses/:id` |
| `admin.adminDeleteCourse` | `DELETE /api/admin/courses/:id` |
| `admin.adminTogglePublish` | `PATCH /api/admin/courses/:id/toggle-publish` |
| `admin.adminListArticles` | `GET /api/admin/articles` |
| `admin.adminCreateArticle` | `POST /api/admin/articles` |
| `admin.adminUpdateArticle` | `PUT /api/admin/articles/:id` |
| `admin.adminDeleteArticle` | `DELETE /api/admin/articles/:id` |
| `admin.adminListProducts` | `GET /api/admin/products` |
| `admin.adminCreateProduct` | `POST /api/admin/products` |
| `admin.adminUpdateProduct` | `PUT /api/admin/products/:id` |
| `admin.adminDeleteProduct` | `DELETE /api/admin/products/:id` |
| `admin.adminListWorkshops` | `GET /api/admin/workshops` |
| `admin.adminCreateWorkshop` | `POST /api/admin/workshops` |
| `admin.adminUpdateWorkshop` | `PUT /api/admin/workshops/:id` |
| `admin.adminDeleteWorkshop` | `DELETE /api/admin/workshops/:id` |
| `admin.adminListInstructors` | `GET /api/admin/instructors` |
| `admin.adminCreateInstructor` | `POST /api/admin/instructors` |
| `admin.adminUpdateInstructor` | `PUT /api/admin/instructors/:id` |
| `admin.adminDeleteInstructor` | `DELETE /api/admin/instructors/:id` |
| `admin.adminUpdateCategory` | `PUT /api/admin/categories/:id` |
| `admin.adminDeleteCategory` | `DELETE /api/admin/categories/:id` |
| `admin.adminGetUsers` | `GET /api/admin/users` |
| `admin.adminSetRole` | `PUT /api/admin/users/:id/role` |
| `admin.adminDeleteUser` | `DELETE /api/admin/users/:id` |
| `profiles.updateMyProfile` | `PUT /api/users/me` |
