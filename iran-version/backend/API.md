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

## Commerce & Enrollment

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/commerce/coupons/check?code=X` | No | Validate coupon |
| POST | `/api/commerce/purchase` | Yes | Purchase items |
| GET | `/api/commerce/orders/my` | Yes | My orders |
| GET | `/api/commerce/orders/admin` | Admin | All orders |
| GET | `/api/commerce/enrollments/my` | Yes | My enrollments |
| POST | `/api/commerce/enrollments/lesson-complete` | Yes | Mark lesson complete |
| GET | `/api/commerce/enrollments/downloads` | Yes | My downloads |
| POST | `/api/commerce/offline-payments/submit` | Yes | Submit offline payment |
| GET | `/api/commerce/offline-payments/my` | Yes | My offline payments |
| GET | `/api/commerce/offline-payments/admin` | Admin | All offline payments |
| POST | `/api/commerce/offline-payments/admin/:id/approve` | Admin | Approve payment |
| POST | `/api/commerce/offline-payments/admin/:id/reject` | Admin | Reject payment |
| DELETE | `/api/commerce/offline-payments/admin/:id` | Admin | Delete payment |
| POST | `/api/commerce/class-enroll/request` | Yes | Request class join |
| GET | `/api/commerce/class-enroll/pending` | Yes | Pending requests |
| POST | `/api/commerce/class-enroll/admin/:id/approve` | Yes | Approve class join |
| POST | `/api/commerce/class-enroll/admin/:id/reject` | Yes | Reject class join |
| POST | `/api/commerce/bookmarks/toggle` | Yes | Toggle bookmark |
| GET | `/api/commerce/bookmarks/my` | Yes | My bookmarks |
| GET | `/api/commerce/bookmarks/check` | Yes | Check bookmark |
| POST | `/api/commerce/flashcards` | Yes | Create flashcard |
| DELETE | `/api/commerce/flashcards/:id` | Yes | Delete flashcard |
| GET | `/api/commerce/flashcards/my` | Yes | My flashcards |
| GET | `/api/commerce/coupons/admin` | Admin | List coupons |
| POST | `/api/commerce/coupons/admin` | Admin | Create coupon |
| PATCH | `/api/commerce/coupons/admin/:id/toggle` | Admin | Toggle coupon |
| DELETE | `/api/commerce/coupons/admin/:id` | Admin | Delete coupon |

### POST /api/commerce/purchase
**Request:**
```json
{
  "items": [{ "type": "course|product|workshop", "refId": "uuid" }],
  "couponCode": "optional"
}
```
**Business Rules:**
- Empty cart rejected
- All items validated (exist + published)
- Workshop capacity checked
- Coupon validated (active, not expired, not exceeded)
- Enrollment created on purchase
- Workshop registration count incremented

### Products

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/products` | List all products |
| POST | `/api/admin/products` | Create product |
| PUT | `/api/admin/products/:id` | Update product |
| DELETE | `/api/admin/products/:id` | Delete product |

## Exams & Daily Quiz

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/exams` | No | List published exams |
| GET | `/api/exams/:slug` | No | Get exam by slug |
| GET | `/api/exams/daily` | No | Get today's daily quiz |
| POST | `/api/exams/submit` | Yes | Submit exam attempt |
| GET | `/api/exams/attempts/:id` | Yes | Get attempt (owner/admin) |
| GET | `/api/exams/my-attempts` | Yes | List my attempts |
| GET | `/api/exams/daily/auth` | Yes | Daily quiz with my answer |
| POST | `/api/exams/daily/answer` | Yes | Answer daily quiz |
| POST | `/api/exams/reports` | Yes | Submit exam report |
| GET | `/api/exams/admin/list` | Admin | List all exams |
| POST | `/api/exams/admin/create` | Admin | Create exam |
| PATCH | `/api/exams/admin/:id/toggle-publish` | Admin | Toggle publish |
| DELETE | `/api/exams/admin/:id` | Admin | Delete exam |
| GET | `/api/exams/admin/reports` | Admin | List exam reports |
| PATCH | `/api/exams/admin/reports/:id/resolve` | Admin | Resolve report |
| DELETE | `/api/exams/admin/reports/:id` | Admin | Delete report |

### POST /api/exams/submit
**Request:**
```json
{ "examId": "uuid", "answers": [{ "questionId": "uuid", "chosenIndex": 0 }] }
```
**Response:** Score, total, percent, topicBreakdown (correctIndex NOT leaked).

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

## Migration Summary

### Queries Migrated (29)

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
| `tests.listExams` | `GET /api/exams` |
| `tests.getExam` | `GET /api/exams/:slug` |
| `tests.getDailyQuiz` | `GET /api/exams/daily` |
| `tests.getMyAttempts` | `GET /api/exams/my-attempts` |
| `tests.getMyLearningProfile` | `GET /api/exams/daily/auth` |
| `enroll.getMyOrders` | `GET /api/commerce/orders/my` |
| `enroll.getMyEnrollments` | `GET /api/commerce/enrollments/my` |
| `enroll.getMyDownloads` | `GET /api/commerce/enrollments/downloads` |
| `enroll.getMyBookmarks` | `GET /api/commerce/bookmarks/my` |
| `enroll.getMyFlashcards` | `GET /api/commerce/flashcards/my` |
| `offlinePayments.myOfflinePayments` | `GET /api/commerce/offline-payments/my` |
| `classEnroll.listPendingRequests` | `GET /api/commerce/class-enroll/pending` |
| `examReports.listExamReports` | `GET /api/exams/admin/reports` |
| `admin.adminListExams` | `GET /api/exams/admin/list` |

### Mutations Migrated (24)

| Convex Mutation | REST Endpoint |
|----------------|---------------|
| `content.createCategory` | `POST /api/content/categories` |
| `admin.adminCreateCourse` | `POST /api/admin/courses` |
| `admin.adminUpdateCourse` | `PUT /api/admin/courses/:id` |
| `admin.adminDeleteCourse` | `DELETE /api/admin/courses/:id` |
| `admin.adminCreateArticle` | `POST /api/admin/articles` |
| `admin.adminUpdateArticle` | `PUT /api/admin/articles/:id` |
| `admin.adminDeleteArticle` | `DELETE /api/admin/articles/:id` |
| `admin.adminCreateProduct` | `POST /api/admin/products` |
| `admin.adminUpdateProduct` | `PUT /api/admin/products/:id` |
| `admin.adminDeleteProduct` | `DELETE /api/admin/products/:id` |
| `admin.adminCreateWorkshop` | `POST /api/admin/workshops` |
| `admin.adminUpdateWorkshop` | `PUT /api/admin/workshops/:id` |
| `admin.adminDeleteWorkshop` | `DELETE /api/admin/workshops/:id` |
| `admin.adminCreateInstructor` | `POST /api/admin/instructors` |
| `admin.adminUpdateInstructor` | `PUT /api/admin/instructors/:id` |
| `admin.adminDeleteInstructor` | `DELETE /api/admin/instructors/:id` |
| `admin.adminUpdateCategory` | `PUT /api/admin/categories/:id` |
| `admin.adminDeleteCategory` | `DELETE /api/admin/categories/:id` |
| `admin.adminSetRole` | `PUT /api/admin/users/:id/role` |
| `admin.adminDeleteUser` | `DELETE /api/admin/users/:id` |
| `profiles.updateMyProfile` | `PUT /api/users/me` |
| `tests.submitExam` | `POST /api/exams/submit` |
| `tests.answerDailyQuiz` | `POST /api/exams/daily/answer` |
| `examReports.submitExamReport` | `POST /api/exams/reports` |
| `enroll.purchase` | `POST /api/commerce/purchase` |
| `enroll.markLessonComplete` | `POST /api/commerce/enrollments/lesson-complete` |
| `enroll.toggleBookmark` | `POST /api/commerce/bookmarks/toggle` |
| `enroll.addFlashcard` | `POST /api/commerce/flashcards` |
| `offlinePayments.submitOfflinePayment` | `POST /api/commerce/offline-payments/submit` |
| `offlinePayments.approveOfflinePayment` | `POST /api/commerce/offline-payments/admin/:id/approve` |
| `offlinePayments.rejectOfflinePayment` | `POST /api/commerce/offline-payments/admin/:id/reject` |
| `classEnroll.requestClassEnroll` | `POST /api/commerce/class-enroll/request` |
| `classEnroll.approveClassEnroll` | `POST /api/commerce/class-enroll/admin/:id/approve` |
| `classEnroll.rejectClassEnroll` | `POST /api/commerce/class-enroll/admin/:id/reject` |

### Business Rules Implemented

1. **Exam Scoring**: Score, total, percent, topicBreakdown — correctIndex NOT leaked
2. **Daily Quiz Idempotency**: One answer per user per day
3. **Exam Report Idempotency**: One open report per user+question
4. **Purchase Validation**: Items exist, published, capacity checked
5. **Coupon Validation**: Active, not expired, not exceeded
6. **Enrollment Auto-Create**: On purchase
7. **Workshop Capacity**: Incremented on purchase
8. **Offline Payment Duplicate**: Same course+tier+pending rejected
9. **Class Enroll**: Duplicate pending/approved rejected
10. **Bookmark Toggle**: Idempotent add/remove

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

---

## Instructor Tools (`/api/instructor`)

Requires: Auth

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/instructor/attendance/rooms` | `GET` | List instructor's rooms |
| `/instructor/attendance/rooms/:roomId/students` | `GET` | List students in a room |
| `/instructor/attendance/rooms/:roomId` | `GET` | Get attendance records |
| `/instructor/attendance/rooms/:roomId/mark` | `POST` | Mark student attendance |
| `/instructor/resources/:courseId` | `GET` | List course resources |
| `/instructor/resources` | `POST` | Add course resource |
| `/instructor/resources/:resourceId` | `DELETE` | Delete resource |
| `/instructor/messages` | `POST` | Send direct message |
| `/instructor/messages/conversations` | `GET` | List conversations |
| `/instructor/messages/:partnerId` | `GET` | Get conversation with partner |
| `/instructor/messages/:partnerId/read` | `POST` | Mark messages as read |
| `/instructor/payments` | `GET` | List instructor payments |
| `/instructor/performance` | `GET` | Student performance stats |
| `/instructor/bank-account` | `GET` | Get bank account info |
| `/instructor/bank-account` | `PUT` | Update bank account |

---

## Notifications (`/api/notifications`)

Requires: Auth

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/notifications` | `GET` | List visible announcements |
| `/notifications/all` | `GET` | List all announcements (admin) |
| `/notifications/mine` | `GET` | List my announcements |
| `/notifications` | `POST` | Create announcement |
| `/notifications/:id` | `DELETE` | Delete announcement |
| `/notifications/reminders` | `GET` | Refresh and get reminders |
| `/notifications/reminders/:id/shown` | `POST` | Mark reminder as shown |
| `/notifications/reminders/arm-next-exam` | `POST` | Arm next-exam reminder |
| `/notifications/reminders/armed-next-exam` | `GET` | Get armed next-exam reminder |
| `/notifications/inbox` | `GET` | List my inbox messages |
| `/notifications/inbox` | `POST` | Send inbox message |
| `/notifications/inbox/:id` | `DELETE` | Delete inbox message |
| `/notifications/inbox/:id/read` | `POST` | Mark inbox message as read |
| `/notifications/inbox/all` | `GET` | List all inbox (admin) |

---

## Media / Storage (`/api/media`)

Requires: Auth

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/media` | `GET` | List media (filter by category, search) |
| `/media/:id` | `GET` | Get media item |
| `/media/:id` | `PUT` | Update media metadata |
| `/media/:id` | `DELETE` | Delete media item |
| `/media/upload` | `POST` | Upload file (multipart/form-data) |
| `/media/presign` | `POST` | Get presigned upload URL |

**Query params for list:** `category`, `search`, `limit`, `offset`

**Allowed MIME types:** jpg, png, gif, webp, svg, pdf, doc/docx, xls/xlsx, mp3, wav, mp4, webm, zip, txt, csv

**Max file size:** 50MB

---

## Convex → REST Migration Summary

| Category | Convex Functions | REST Endpoints |
|----------|-----------------|----------------|
| Auth | 5 | 5 |
| Content (public) | 15 | 14 |
| Users | 3 | 3 |
| Admin (CRUD) | 28 | 30 |
| Exams | 10 | 17 |
| Commerce | 14 | 28 |
| Mentor | 8 | 18 |
| Tickets | 4 | 7 |
| Comments | 3 | 6 |
| Dictionary | 3 | 5 |
| Instructor Tools | 12 | 15 |
| Notifications | 10 | 14 |
| Storage/Media | 4 | 6 |
| **Total** | **~119** | **~168** |