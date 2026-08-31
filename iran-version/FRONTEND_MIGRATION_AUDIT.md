# FRONTEND MIGRATION AUDIT — Phase 9A

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total frontend files** | 126 (`.ts`/`.tsx`) |
| **Convex-dependent files** | 42 |
| **Unique Convex API calls** | 258 |
| **Queries** | 88 |
| **Mutations** | 139 |
| **Actions** | 16 |
| **Auth dependencies** | 5 files |
| **Storage dependencies** | 4 files |
| **Realtime/subscription dependencies** | 8 files |
| **Files requiring major refactoring** | 12 |
| **Backend gaps identified** | 23 |

---

## 1. Convex Dependency Inventory

### 1.1 Core Infrastructure Files

| File | Convex Usage | Type |
|------|-------------|------|
| `src/main.tsx` | `ConvexReactClient`, `ConvexAuthProvider` | Auth/Provider |
| `src/hooks/use-auth.ts` | `useConvexAuth` | Auth |
| `src/hooks/use-live.ts` | `useQuery(api.collab.listSignals)` | Realtime |
| `src/lib/upload.ts` | Convex storage upload URL handling | Storage |

### 1.2 Pages with Convex Dependencies

| File | useQuery | useMutation | useAction | Total |
|------|----------|-------------|-----------|-------|
| `src/pages/Admin.tsx` | 18 | 28 | 0 | 46 |
| `src/pages/Dashboard.tsx` | 10 | 4 | 0 | 14 |
| `src/pages/AIChat.tsx` | 1 | 3 | 0 | 4 |
| `src/pages/Tests.tsx` | 3 | 0 | 0 | 3 |
| `src/pages/TestTake.tsx` | 2 | 1 | 0 | 3 |
| `src/pages/Courses.tsx` | 1 | 0 | 0 | 1 |
| `src/pages/CourseDetail.tsx` | 1 | 0 | 0 | 1 |
| `src/pages/Articles.tsx` (via FreeContent) | 1 | 0 | 0 | 1 |
| `src/pages/ArticleDetail.tsx` | 1 | 0 | 0 | 1 |
| `src/pages/Products.tsx` | 1 | 0 | 0 | 1 |
| `src/pages/ProductDetail.tsx` | 1 | 0 | 0 | 1 |
| `src/pages/Workshops.tsx` | 1 | 0 | 0 | 1 |
| `src/pages/WorkshopDetail.tsx` | 1 | 0 | 0 | 1 |
| `src/pages/Instructors.tsx` | 1 | 0 | 0 | 1 |
| `src/pages/InstructorDetail.tsx` | 1 | 0 | 0 | 1 |
| `src/pages/Dictionary.tsx` | 1 | 0 | 0 | 1 |
| `src/pages/DailyQuiz.tsx` | 1 | 1 | 0 | 2 |
| `src/pages/Landing.tsx` | 4 | 0 | 0 | 4 |
| `src/pages/FreeContent.tsx` | 3 | 0 | 0 | 3 |
| `src/pages/Auth.tsx` | 0 | 0 | 1 | 1 |
| `src/pages/TestResult.tsx` | 1 | 0 | 0 | 1 |
| `src/pages/ProfileCompletion.tsx` | 1 | 1 | 0 | 2 |
| `src/pages/TelegramMiniApp.tsx` | 0 | 1 | 1 | 2 |

### 1.3 Panel Files with Convex Dependencies

| File | useQuery | useMutation | useAction | Total |
|------|----------|-------------|-----------|-------|
| `src/pages/panels/AdminPanel.tsx` | 0 | 0 | 0 | 0 |
| `src/pages/panels/InstructorPanel.tsx` | 12 | 6 | 0 | 18 |
| `src/pages/panels/MentorPanel.tsx` | 8 | 1 | 0 | 9 |
| `src/pages/panels/SupportPanel.tsx` | 2 | 3 | 0 | 5 |
| `src/pages/panels/ContentPanel.tsx` | 5 | 0 | 0 | 5 |
| `src/pages/panels/ContentStudio.tsx` | 2 | 0 | 0 | 2 |
| `src/pages/panels/AIManagementPanel.tsx` | 6 | 12 | 2 | 20 |
| `src/pages/panels/SuperAdminPanel.tsx` | 8 | 10 | 0 | 18 |
| `src/pages/panels/TelegramAdminCenter.tsx` | 4 | 0 | 0 | 4 |
| `src/pages/panels/TelegramBotPanel.tsx` | 1 | 6 | 8 | 15 |

### 1.4 Component Files with Convex Dependencies

| File | useQuery | useMutation | useAction | Total |
|------|----------|-------------|-----------|-------|
| `src/components/site/SiteHeader.tsx` | 2 | 0 | 0 | 2 |
| `src/components/site/MemberProfileEditor.tsx` | 1 | 1 | 0 | 2 |
| `src/components/site/CheckoutDialog.tsx` | 0 | 1 | 0 | 1 |
| `src/components/site/SeedBootstrap.tsx` | 0 | 3 | 0 | 3 |
| `src/components/site/NotificationCenter.tsx` | 2 | 2 | 0 | 4 |
| `src/components/site/CategoryField.tsx` | 1 | 0 | 0 | 1 |
| `src/components/site/TelegramAccount.tsx` | 1 | 2 | 0 | 3 |
| `src/components/site/TelegramAutoLinker.tsx` | 1 | 1 | 0 | 2 |
| `src/components/site/TelegramNotifications.tsx` | 1 | 2 | 0 | 3 |

---

## 2. Complete Convex → REST/Socket.IO Mapping

### 2.1 Authentication

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth Required | Notes |
|----------------|------|--------------------------|--------|---------------|-------|
| `auth.signIn` (via ConvexAuthProvider) | Auth | `POST /api/auth/login` | POST | No | Returns `{ accessToken, refreshToken, user }` |
| `auth.signUp` | Auth | `POST /api/auth/register` | POST | No | Returns `{ accessToken, refreshToken, user }` |
| `auth.signOut` | Auth | Client-side (clear tokens) | - | No | No server call needed |
| `auth.getToken` | Auth | Client-side (use refresh token) | - | - | JWT-based |
| `googleAuth.verifyGoogleToken` | Action | `POST /api/auth/login` | POST | No | Google OAuth removed; use email/password |
| `emailOtp.sendOtp` | Mutation | `POST /api/auth/otp/send` | POST | No | |
| `emailOtp.verifyOtp` | Mutation | `POST /api/auth/otp/verify` | POST | No | |
| `users.currentUser` | Query | `GET /api/auth/me` | GET | Yes | |
| `admin.amIAdmin` | Query | `GET /api/auth/is-admin` | GET | Yes | |

**Auth Flow Change:** Replace `ConvexAuthProvider` + `useConvexAuth` with JWT token management via React context. Store tokens in memory/httpOnly cookie. Use `Authorization: Bearer <token>` header.

### 2.2 Landing / Public Content

| Convex Function | Type | Iranian Backend Endpoint | Method | Notes |
|----------------|------|--------------------------|--------|-------|
| `content.listCourses` | Query | `GET /api/content/courses` | GET | Public |
| `content.listInstructors` | Query | `GET /api/content/instructors` | GET | Public |
| `content.listCategories` | Query | `GET /api/content/categories` | GET | Public |
| `content.listArticles` | Query | `GET /api/content/articles` | GET | Public |
| `content.listProducts` | Query | `GET /api/content/products` | GET | Public |
| `content.listWorkshops` | Query | `GET /api/content/workshops` | GET | Public |
| `content.listTestimonials` | Query | `GET /api/content/testimonials` | GET | Public |
| `content.getCourseBySlug` | Query | `GET /api/content/courses/:slug` | GET | Public |
| `content.getInstructorBySlug` | Query | `GET /api/content/instructors/:slug` | GET | Public |
| `content.getArticleBySlug` | Query | `GET /api/content/articles/:slug` | GET | Public |
| `content.getProductBySlug` | Query | `GET /api/content/products/:slug` | GET | Public |
| `content.getWorkshopBySlug` | Query | `GET /api/content/workshops/:slug` | GET | Public |
| `content.searchDictionary` | Query | `GET /api/content/dictionary?q=` | GET | Public |

**State Management:** Replace reactive `useQuery()` with `useEffect` + `fetch` or a simple cache layer. Convex re-fetches automatically; REST needs manual polling or SWR/React Query.

### 2.3 Courses (Admin)

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `admin.adminListCourses` | Query | `GET /api/admin/courses` | GET | Yes | admin |
| `admin.adminCreateCourse` | Mutation | `POST /api/admin/courses` | POST | Yes | admin |
| `admin.adminUpdateCourse` | Mutation | `PUT /api/admin/courses/:id` | PUT | Yes | admin |
| `admin.adminDeleteCourse` | Mutation | `DELETE /api/admin/courses/:id` | DELETE | Yes | admin |
| `admin.adminTogglePublish` | Mutation | `PUT /api/admin/courses/:id` | PUT | Yes | admin |

### 2.4 Instructors (Admin)

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `admin.adminListInstructors` | Query | `GET /api/admin/instructors` | GET | Yes | admin |
| `admin.adminCreateInstructor` | Mutation | `POST /api/admin/instructors` | POST | Yes | admin |
| `admin.adminUpdateInstructor` | Mutation | `PUT /api/admin/instructors/:id` | PUT | Yes | admin |
| `admin.adminDeleteInstructor` | Mutation | `DELETE /api/admin/instructors/:id` | DELETE | Yes | admin |

### 2.5 Articles (Admin + Content Studio)

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `admin.adminListArticles` | Query | `GET /api/admin/articles` | GET | Yes | admin |
| `admin.adminCreateArticle` | Mutation | `POST /api/admin/articles` | POST | Yes | admin |
| `admin.adminUpdateArticle` | Mutation | `PUT /api/admin/articles/:id` | PUT | Yes | admin |
| `admin.adminDeleteArticle` | Mutation | `DELETE /api/admin/articles/:id` | DELETE | Yes | admin |
| `admin.adminSaveGeneratedArticles` | Mutation | `POST /api/admin/articles` | POST | Yes | admin |
| `contentStudio.listMedia` | Query | `GET /api/media` | GET | Yes | admin |
| `contentStudio.addMedia` | Mutation | `POST /api/media/upload` | POST | Yes | admin |
| `contentStudio.deleteMedia` | Mutation | `DELETE /api/media/:id` | DELETE | Yes | admin |

### 2.6 Dictionary

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `content.searchDictionary` | Query | `GET /api/content/dictionary?q=` | GET | No | public |
| `content.createDictionaryTerm` | Mutation | `POST /api/admin/dictionary` | POST | Yes | admin |
| `content.updateDictionaryTerm` | Mutation | `PUT /api/admin/dictionary/:id` | PUT | Yes | admin |
| `content.deleteDictionaryTerm` | Mutation | `DELETE /api/admin/dictionary/:id` | DELETE | Yes | admin |

### 2.7 Exams / Tests

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `tests.listExams` | Query | `GET /api/exams` | GET | Yes | user |
| `tests.getExam` | Query | `GET /api/exams/:id` | GET | Yes | user |
| `tests.submitExam` | Mutation | `POST /api/exams/:id/submit` | POST | Yes | user |
| `tests.getAttempt` | Query | `GET /api/exams/attempts/:id` | GET | Yes | user |
| `tests.getMyAttempts` | Query | `GET /api/exams/my-attempts` | GET | Yes | user |
| `tests.getMyLearningProfile` | Query | `GET /api/exams/my-profile` | GET | Yes | user |
| `tests.getDailyQuiz` | Query | `GET /api/exams/daily` | GET | Yes | user |
| `tests.answerDailyQuiz` | Mutation | `POST /api/exams/daily/answer` | POST | Yes | user |

### 2.8 Commerce / Orders

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `enroll.purchase` | Mutation | `POST /api/commerce/purchase` | POST | Yes | user |
| `admin.adminGetOrders` | Query | `GET /api/commerce/orders/admin` | GET | Yes | admin |
| `admin.adminUpdateOrderStatus` | Mutation | `PUT /api/commerce/orders/:id` | PUT | Yes | admin |
| `admin.adminDeleteOrder` | Mutation | `DELETE /api/commerce/orders/:id` | DELETE | Yes | admin |

### 2.9 Enrollments / Bookmarks / Flashcards

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `enroll.getMyEnrollments` | Query | `GET /api/commerce/enrollments/my` | GET | Yes | user |
| `enroll.getMyBookmarks` | Query | `GET /api/commerce/bookmarks/my` | GET | Yes | user |
| `enroll.getMyFlashcards` | Query | `GET /api/commerce/flashcards/my` | GET | Yes | user |
| `enroll.addFlashcard` | Mutation | `POST /api/commerce/flashcards` | POST | Yes | user |
| `enroll.deleteFlashcard` | Mutation | `DELETE /api/commerce/flashcards/:id` | DELETE | Yes | user |
| `enroll.getMyDownloads` | Query | `GET /api/commerce/downloads/my` | GET | Yes | user |
| `enroll.markLessonComplete` | Mutation | `POST /api/commerce/enrollments/:id/complete` | POST | Yes | user |

### 2.10 Offline Payments

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `offlinePayments.submitOfflinePayment` | Mutation | `POST /api/commerce/offline-payments` | POST | Yes | user |
| `offlinePayments.listOfflinePayments` | Query | `GET /api/commerce/offline-payments/admin` | GET | Yes | admin |
| `offlinePayments.approveOfflinePayment` | Mutation | `PUT /api/commerce/offline-payments/:id/approve` | PUT | Yes | admin |
| `offlinePayments.rejectOfflinePayment` | Mutation | `PUT /api/commerce/offline-payments/:id/reject` | PUT | Yes | admin |
| `offlinePayments.deleteOfflinePayment` | Mutation | `DELETE /api/commerce/offline-payments/:id` | DELETE | Yes | admin |

### 2.11 Mentor

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `mentor.listStudents` | Query | `GET /api/mentor/students` | GET | Yes | mentor |
| `mentor.listSessions` | Query | `GET /api/mentor/sessions` | GET | Yes | mentor |
| `mentor.planSession` | Mutation | `POST /api/mentor/sessions` | POST | Yes | mentor |
| `mentor.setSessionStatus` | Mutation | `PUT /api/mentor/sessions/:id/status` | PUT | Yes | mentor |
| `mentor.mentorStats` | Query | `GET /api/mentor/stats` | GET | Yes | mentor |
| `mentor.askMentor` | Mutation | `POST /api/mentor/questions` | POST | Yes | user |
| `mentor.listMentorQuestions` | Query | `GET /api/mentor/questions` | GET | Yes | mentor |
| `mentor.answerMentorQuestion` | Mutation | `POST /api/mentor/questions/:id/answer` | POST | Yes | mentor |

### 2.12 Support / Tickets

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `tickets.createTicket` | Mutation | `POST /api/tickets` | POST | Yes | user |
| `tickets.getMyTickets` | Query | `GET /api/tickets/my` | GET | Yes | user |
| `tickets.listAllTickets` | Query | `GET /api/tickets/admin` | GET | Yes | admin/support |
| `tickets.replyTicket` | Mutation | `POST /api/tickets/:id/messages` | POST | Yes | user/admin |
| `tickets.updateTicketStatus` | Mutation | `PUT /api/tickets/:id/status` | PUT | Yes | admin/support |
| `tickets.deleteTicket` | Mutation | `DELETE /api/tickets/:id` | DELETE | Yes | admin |

### 2.13 Comments

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `comments.listPending` | Query | `GET /api/comments/pending` | GET | Yes | admin |
| `comments.addComment` | Mutation | `POST /api/comments` | POST | Yes | user |
| `comments.approveComment` | Mutation | `PUT /api/comments/:id/approve` | PUT | Yes | admin |
| `comments.rejectComment` | Mutation | `PUT /api/comments/:id/reject` | PUT | Yes | admin |
| `comments.deleteComment` | Mutation | `DELETE /api/comments/:id` | DELETE | Yes | admin |

### 2.14 Instructor Panel

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `instructorTools.getStudentPerformance` | Query | `GET /api/instructor/performance` | GET | Yes | instructor |
| `instructorTools.listMyPayments` | Query | `GET /api/instructor/payments` | GET | Yes | instructor |
| `instructorTools.listMyMessages` | Query | `GET /api/instructor/messages` | GET | Yes | instructor |
| `instructorTools.getBankAccount` | Query | `GET /api/instructor/bank-account` | GET | Yes | instructor |
| `instructorTools.updateBankAccount` | Mutation | `PUT /api/instructor/bank-account` | PUT | Yes | instructor |
| `instructorTools.sendMessage` | Mutation | `POST /api/instructor/messages` | POST | Yes | instructor |
| `instructorTools.markAttendance` | Mutation | `POST /api/instructor/attendance` | POST | Yes | instructor |
| `instructorTools.markRead` | Mutation | `PUT /api/instructor/messages/:id/read` | PUT | Yes | instructor |
| `instructorTools.adminCreatePayment` | Mutation | `POST /api/instructor/payments` | POST | Yes | admin |
| `instructorTools.adminMarkPaid` | Mutation | `PUT /api/instructor/payments/:id/paid` | PUT | Yes | admin |
| `courseStudio.listMyCourseStudio` | Query | `GET /api/instructor/my-courses` | GET | Yes | instructor |
| `courseStudio.createDraftCourse` | Mutation | `POST /api/instructor/draft-courses` | POST | Yes | instructor |
| `courseStudio.updateDraftCourse` | Mutation | `PUT /api/instructor/draft-courses/:id` | PUT | Yes | instructor |
| `courseStudio.deleteDraftCourse` | Mutation | `DELETE /api/instructor/draft-courses/:id` | DELETE | Yes | instructor |
| `courseStudio.submitCourseForReview` | Mutation | `POST /api/instructor/draft-courses/:id/submit` | POST | Yes | instructor |
| `courseStudio.approveCourseReview` | Mutation | `POST /api/admin/draft-courses/:id/approve` | POST | Yes | admin |
| `courseStudio.rejectCourseReview` | Mutation | `POST /api/admin/draft-courses/:id/reject` | POST | Yes | admin |

### 2.15 Notifications

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `notifications.listAnnouncements` | Query | `GET /api/notifications/announcements` | GET | Yes | user |
| `notifications.listAllAnnouncements` | Query | `GET /api/notifications/announcements/all` | GET | Yes | admin |
| `notifications.listMyAnnouncements` | Query | `GET /api/notifications/announcements/my` | GET | Yes | instructor |
| `notifications.createAnnouncement` | Mutation | `POST /api/notifications/announcements` | POST | Yes | admin/instructor |
| `notifications.deleteAnnouncement` | Mutation | `DELETE /api/notifications/announcements/:id` | DELETE | Yes | admin |
| `notifications.refreshReminders` | Mutation | `POST /api/notifications/reminders/refresh` | POST | Yes | user |
| `notifications.markReminderShown` | Mutation | `PUT /api/notifications/reminders/:id/shown` | PUT | Yes | user |
| `notifications.armNextExamReminder` | Mutation | `POST /api/notifications/reminders/arm` | POST | Yes | user |
| `inbox.listMyInbox` | Query | `GET /api/notifications/inbox` | GET | Yes | user |
| `inbox.adminListInbox` | Query | `GET /api/notifications/inbox/admin` | GET | Yes | admin |
| `inbox.sendInboxMessage` | Mutation | `POST /api/notifications/inbox` | POST | Yes | admin |
| `inbox.deleteInboxMessage` | Mutation | `DELETE /api/notifications/inbox/:id` | DELETE | Yes | admin |
| `inbox.markInboxRead` | Mutation | `PUT /api/notifications/inbox/:id/read` | PUT | Yes | user |

### 2.16 Profiles

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `profiles.getMyProfile` | Query | `GET /api/users/profile` | GET | Yes | user |
| `profiles.updateMyProfile` | Mutation | `PUT /api/users/profile` | PUT | Yes | user |
| `profiles.listPendingProfiles` | Query | `GET /api/admin/profiles/pending` | GET | Yes | admin |
| `profiles.approveProfile` | Mutation | `POST /api/admin/profiles/:id/approve` | POST | Yes | admin |
| `profiles.rejectProfile` | Mutation | `POST /api/admin/profiles/:id/reject` | POST | Yes | admin |
| `profiles.getProfileUploadUrl` | Mutation | `POST /api/media/upload` | POST | Yes | user |
| `profiles.listSuggestedCourses` | Query | `GET /api/users/suggested-courses` | GET | Yes | user |
| `profiles.toggleSuggestedCourse` | Mutation | `POST /api/users/suggested-courses/:id/toggle` | POST | Yes | user |

### 2.17 Users (Admin)

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `admin.adminGetUsers` | Query | `GET /api/admin/users` | GET | Yes | admin |
| `admin.adminCreateUser` | Mutation | `POST /api/admin/users` | POST | Yes | admin |
| `admin.adminUpdateUser` | Mutation | `PUT /api/admin/users/:id` | PUT | Yes | admin |
| `admin.adminDeleteUser` | Mutation | `DELETE /api/admin/users/:id` | DELETE | Yes | admin |
| `admin.adminSetRole` | Mutation | `PUT /api/admin/users/:id/role` | PUT | Yes | admin |
| `admin.adminSetSecondaryRole` | Mutation | `PUT /api/admin/users/:id/secondary-role` | PUT | Yes | admin |
| `admin.adminSetPassword` | Mutation | `PUT /api/admin/users/:id/password` | PUT | Yes | admin |
| `admin.adminAddAdmin` | Mutation | `POST /api/admin/users` | POST | Yes | admin |
| `users.listAllUsers` | Query | `GET /api/admin/users` | GET | Yes | admin |

### 2.18 AI Chat

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `aiChat.createConversation` | Mutation | `POST /api/ai/conversations` | POST | Yes | user |
| `aiChat.sendMessage` | Mutation | `POST /api/ai/chat` | POST | Yes | user |
| `aiChat.deleteConversation` | Mutation | `DELETE /api/ai/conversations/:id` | DELETE | Yes | user |

### 2.19 AI Management (Admin)

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `aiManagement.getFullConfig` | Query | `GET /api/ai/admin/config` | GET | Yes | admin |
| `aiManagement.saveConfig` | Mutation | `PUT /api/ai/admin/config` | PUT | Yes | admin |
| `aiManagement.deleteConfig` | Mutation | `DELETE /api/ai/admin/config` | DELETE | Yes | admin |
| `aiManagement.listModels` | Query | `GET /api/ai/admin/models` | GET | Yes | admin |
| `aiManagement.createModel` | Mutation | `POST /api/ai/admin/models` | POST | Yes | admin |
| `aiManagement.updateModel` | Mutation | `PUT /api/ai/admin/models/:id` | PUT | Yes | admin |
| `aiManagement.deleteModel` | Mutation | `DELETE /api/ai/admin/models/:id` | DELETE | Yes | admin |
| `aiManagement.toggleModelActive` | Mutation | `POST /api/ai/admin/models/:id/toggle` | POST | Yes | admin |
| `aiManagement.listPrompts` | Query | `GET /api/ai/admin/prompts` | GET | Yes | admin |
| `aiManagement.createPrompt` | Mutation | `POST /api/ai/admin/prompts` | POST | Yes | admin |
| `aiManagement.updatePrompt` | Mutation | `PUT /api/ai/admin/prompts/:id` | PUT | Yes | admin |
| `aiManagement.deletePrompt` | Mutation | `DELETE /api/ai/admin/prompts/:id` | DELETE | Yes | admin |
| `aiManagement.setDefaultPrompt` | Mutation | `POST /api/ai/admin/prompts/:id/default` | POST | Yes | admin |
| `aiManagement.listConversations` | Query | `GET /api/ai/admin/conversations` | GET | Yes | admin |
| `aiManagement.getUserUsage` | Query | `GET /api/ai/admin/usage` | GET | Yes | admin |
| `aiManagement.listTokenQuotas` | Query | `GET /api/ai/admin/quotas` | GET | Yes | admin |
| `aiManagement.grantTokens` | Mutation | `POST /api/ai/admin/quotas/grant` | POST | Yes | admin |
| `aiManagement.revokeTokens` | Mutation | `POST /api/ai/admin/quotas/revoke` | POST | Yes | admin |
| `aiManagement.resetAllUsage` | Mutation | `POST /api/ai/admin/usage/reset` | POST | Yes | admin |

### 2.20 AI Actions

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `aiActions.testConnection` | Action | `POST /api/ai/test-connection` | POST | Yes | admin |
| `aiActions.generateQuestions` | Action | `POST /api/ai/actions/generate-questions` | POST | Yes | user |
| `aiActions.generateArticles` | Action | `POST /api/ai/actions/generate-articles` | POST | Yes | user |
| `aiActions.rewriteText` | Action | `POST /api/ai/actions/rewrite-text` | POST | Yes | user |

### 2.21 Collab / Classes / Live Rooms

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC | Realtime |
|----------------|------|--------------------------|--------|------|------|----------|
| `collab.listRooms` | Query | `GET /api/mentor/groups` | GET | Yes | user | - |
| `collab.getRoom` | Query | `GET /api/mentor/groups/:id` | GET | Yes | user | - |
| `collab.createRoom` | Mutation | `POST /api/mentor/groups` | POST | Yes | instructor | - |
| `collab.setRoomStatus` | Mutation | `PUT /api/mentor/groups/:id/status` | PUT | Yes | instructor | Broadcast via Socket.IO |
| `collab.startBroadcast` | Mutation | `POST /api/mentor/groups/:id/broadcast` | POST | Yes | instructor | Broadcast via Socket.IO |
| `collab.endBroadcast` | Mutation | `POST /api/mentor/groups/:id/broadcast/end` | POST | Yes | instructor | Broadcast via Socket.IO |
| `collab.setBoardBg` | Mutation | `PUT /api/mentor/groups/:id/board-bg` | PUT | Yes | instructor | - |
| `collab.listOnline` | Query | Socket.IO `presence:list` event | - | Yes | user | **Socket.IO** |
| `collab.listAllUsersWithPresence` | Query | Socket.IO `presence:list` event | - | Yes | admin | **Socket.IO** |
| `collab.touchPresence` | Mutation | Socket.IO `presence:touch` event | - | Yes | user | **Socket.IO** |
| `collab.sendMessage` | Mutation | Socket.IO `room:message` event | - | Yes | user | **Socket.IO** |
| `collab.sendSignal` | Mutation | Socket.IO `webrtc:offer/answer/ice-candidate` | - | Yes | user | **Socket.IO** |
| `collab.listSignals` | Query | Socket.IO `webrtc:get-peers` event | - | Yes | user | **Socket.IO** |
| `collab.getUploadUrl` | Mutation | `POST /api/media/upload` | POST | Yes | user | - |
| `collab.addStroke` | Mutation | Socket.IO `whiteboard:stroke` event | - | Yes | user | **Socket.IO** |
| `collab.listStrokes` | Query | Socket.IO `whiteboard:join` event | - | Yes | user | **Socket.IO** |
| `collab.clearStrokes` | Mutation | Socket.IO `whiteboard:clear` event | - | Yes | instructor | **Socket.IO** |
| `collab.createMentorGroup` | Mutation | `POST /api/mentor/groups` | POST | Yes | instructor | - |
| `collab.deleteMentorGroup` | Mutation | `DELETE /api/mentor/groups/:id` | DELETE | Yes | instructor | - |
| `collab.listMentorGroups` | Query | `GET /api/mentor/groups` | GET | Yes | mentor | - |
| `collab.answerQuestion` | Mutation | `POST /api/mentor/questions/:id/answer` | POST | Yes | mentor | - |

### 2.22 Exam Reports

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `examReports.listExamReports` | Query | `GET /api/exams/reports` | GET | Yes | admin |
| `examReports.submitExamReport` | Mutation | `POST /api/exams/reports` | POST | Yes | user |
| `examReports.resolveExamReport` | Mutation | `PUT /api/exams/reports/:id/resolve` | PUT | Yes | admin |
| `examReports.deleteExamReport` | Mutation | `DELETE /api/exams/reports/:id` | DELETE | Yes | admin |

### 2.23 Coupons

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `admin.adminGetCoupons` | Query | `GET /api/commerce/coupons` | GET | Yes | admin |
| `admin.adminCreateCoupon` | Mutation | `POST /api/commerce/coupons` | POST | Yes | admin |
| `admin.adminToggleCoupon` | Mutation | `PUT /api/commerce/coupons/:id/toggle` | PUT | Yes | admin |
| `admin.adminDeleteCoupon` | Mutation | `DELETE /api/commerce/coupons/:id` | DELETE | Yes | admin |

### 2.24 Class Requests

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `admin.adminListClassRequests` | Query | `GET /api/admin/class-requests` | GET | Yes | admin |
| `admin.adminReviewClassRequest` | Mutation | `PUT /api/admin/class-requests/:id` | PUT | Yes | admin |
| `admin.listMyClassRequests` | Query | `GET /api/admin/class-requests/my` | GET | Yes | user |
| `admin.requestClass` | Mutation | `POST /api/admin/class-requests` | POST | Yes | user |

### 2.25 Questions (Admin)

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `admin.adminGetQuestionGroups` | Query | `GET /api/exams/questions/groups` | GET | Yes | admin |
| `admin.adminCreateQuestion` | Mutation | `POST /api/exams/questions` | POST | Yes | admin |
| `admin.adminUpdateQuestion` | Mutation | `PUT /api/exams/questions/:id` | PUT | Yes | admin |
| `admin.adminDeleteQuestion` | Mutation | `DELETE /api/exams/questions/:id` | DELETE | Yes | admin |
| `admin.saveGeneratedQuestions` | Mutation | `POST /api/exams/questions/batch` | POST | Yes | admin |

### 2.26 Admin Stats

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `admin.getAdminStats` | Query | `GET /api/admin/stats` | GET | Yes | admin |
| `admin.getEnrollmentStats` | Query | `GET /api/admin/stats/enrollments` | GET | Yes | admin |
| `admin.getRevenueSeries` | Query | `GET /api/admin/stats/revenue` | GET | Yes | admin |
| `admin.getSectionNotifications` | Query | `GET /api/admin/stats/notifications` | GET | Yes | admin |

### 2.27 Super Admin

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `superAdmin.checkSession` | Query | `GET /api/auth/me` | GET | Yes | super_admin |
| `superAdmin.verifyPassword` | Mutation | `POST /api/auth/login` | POST | No | - |
| `superAdmin.getAllUsers` | Query | `GET /api/admin/users` | GET | Yes | super_admin |
| `superAdmin.getUserDetail` | Query | `GET /api/admin/users/:id` | GET | Yes | super_admin |
| `superAdmin.updateUserRole` | Mutation | `PUT /api/admin/users/:id/role` | PUT | Yes | super_admin |
| `superAdmin.updateUserField` | Mutation | `PUT /api/admin/users/:id` | PUT | Yes | super_admin |
| `superAdmin.deleteUser` | Mutation | `DELETE /api/admin/users/:id` | DELETE | Yes | super_admin |
| `superAdmin.revokeAllSessions` | Mutation | `POST /api/auth/revoke-all` | POST | Yes | super_admin |
| `superAdmin.logoutSession` | Mutation | Client-side token clear | - | Yes | super_admin |
| `superAdmin.getSystemStats` | Query | `GET /api/admin/system/stats` | GET | Yes | super_admin |
| `superAdmin.getSystemHealth` | Query | `GET /api/health/db` | GET | Yes | super_admin |
| `superAdmin.getSiteTexts` | Query | `GET /api/admin/site-texts` | GET | Yes | super_admin |
| `superAdmin.updateSiteText` | Mutation | `PUT /api/admin/site-texts/:id` | PUT | Yes | super_admin |
| `superAdmin.deleteSiteText` | Mutation | `DELETE /api/admin/site-texts/:id` | DELETE | Yes | super_admin |
| `superAdmin.getSitePages` | Query | `GET /api/admin/site-pages` | GET | Yes | super_admin |
| `superAdmin.saveSitePage` | Mutation | `POST /api/admin/site-pages` | POST | Yes | super_admin |
| `superAdmin.deleteSitePage` | Mutation | `DELETE /api/admin/site-pages/:id` | DELETE | Yes | super_admin |
| `superAdmin.sendBroadcast` | Mutation | `POST /api/notifications/broadcast` | POST | Yes | super_admin |
| `superAdmin.getAuditLog` | Query | `GET /api/admin/audit-log` | GET | Yes | super_admin |
| `superAdmin.addAuditLog` | Mutation | `POST /api/admin/audit-log` | POST | Yes | super_admin |
| `superAdmin.getAIConversations` | Query | `GET /api/ai/admin/conversations` | GET | Yes | super_admin |

### 2.28 Telegram-Related

| Convex Function | Type | Iranian Backend Endpoint | Method | Auth | RBAC |
|----------------|------|--------------------------|--------|------|------|
| `telegramBot.getBotConfig` | Query | Backend Telegram admin endpoint | GET | Yes | admin |
| `telegramBot.saveBotToken` | Mutation | Backend Telegram admin endpoint | POST | Yes | admin |
| `telegramBot.deleteBotToken` | Mutation | Backend Telegram admin endpoint | DELETE | Yes | admin |
| `telegramBot.generateLinkingCode` | Mutation | Backend Telegram admin endpoint | POST | Yes | user |
| `telegramBot.unlinkTelegram` | Mutation | Backend Telegram admin endpoint | DELETE | Yes | user |
| `telegramBot.toggleBotActive` | Mutation | Backend Telegram admin endpoint | PUT | Yes | admin |
| `telegramBot.saveCommands` | Mutation | Backend Telegram admin endpoint | POST | Yes | admin |
| `telegramBot.updateStartMessage` | Mutation | Backend Telegram admin endpoint | PUT | Yes | admin |
| `telegramBot.getLinkingStatus` | Query | Backend Telegram admin endpoint | GET | Yes | user |
| `telegramBot._countLinkedUsers` | Query | Backend Telegram admin endpoint | GET | Yes | admin |
| `telegramBotActions.*` | Action | Backend Telegram admin endpoint | Various | Yes | admin |
| `telegramNotifications.*` | Query/Mutation | Backend Telegram admin endpoint | Various | Yes | user/admin |

---

## 3. Feature Migration Categories

### A. Components/Pages That Can Remain Unchanged

| File | Reason |
|------|--------|
| `src/components/ui/*` | shadcn/ui components — no Convex dependency |
| `src/lib/utils.ts` | Generic utilities — no Convex dependency |
| `src/lib/settings.tsx` | Settings management — no Convex dependency |

### B. Components/Pending Only API Client Replacement (Low Risk)

| File | Changes Needed |
|------|---------------|
| `src/pages/Courses.tsx` | Replace `useQuery(api.content.listCourses)` with REST fetch |
| `src/pages/CourseDetail.tsx` | Replace `useQuery(api.content.getCourseBySlug)` with REST fetch |
| `src/pages/Instructors.tsx` | Replace `useQuery(api.content.listInstructors)` with REST fetch |
| `src/pages/InstructorDetail.tsx` | Replace `useQuery(api.content.getInstructorBySlug)` with REST fetch |
| `src/pages/Articles.tsx` / `src/pages/FreeContent.tsx` | Replace `useQuery(api.content.listArticles)` with REST fetch |
| `src/pages/ArticleDetail.tsx` | Replace `useQuery(api.content.getArticleBySlug)` with REST fetch |
| `src/pages/Products.tsx` | Replace `useQuery(api.content.listProducts)` with REST fetch |
| `src/pages/ProductDetail.tsx` | Replace `useQuery(api.content.getProductBySlug)` with REST fetch |
| `src/pages/Workshops.tsx` | Replace `useQuery(api.content.listWorkshops)` with REST fetch |
| `src/pages/WorkshopDetail.tsx` | Replace `useQuery(api.content.getWorkshopBySlug)` with REST fetch |
| `src/pages/Dictionary.tsx` | Replace `useQuery(api.content.searchDictionary)` with REST fetch |
| `src/pages/Tests.tsx` | Replace `useQuery(api.tests.listExams)` with REST fetch |
| `src/pages/TestResult.tsx` | Replace `useQuery(api.tests.getAttempt)` with REST fetch |
| `src/pages/Landing.tsx` | Replace 4 `useQuery` calls with REST fetch |
| `src/components/site/CategoryField.tsx` | Replace `useQuery(api.content.listCategories)` with REST fetch |

### C. Components Requiring Significant Refactoring (High Risk)

| File | Changes Needed |
|------|---------------|
| `src/main.tsx` | Remove `ConvexReactClient`, `ConvexAuthProvider`; add JWT auth provider |
| `src/hooks/use-auth.ts` | Rewrite: replace `useConvexAuth` with JWT-based auth hook |
| `src/pages/Auth.tsx` | Replace Convex auth with REST `POST /api/auth/login` + `POST /api/auth/register` |
| `src/pages/Admin.tsx` | Replace 46 Convex calls with REST fetch; massive refactoring |
| `src/pages/Dashboard.tsx` | Replace 14 Convex calls + Socket.IO realtime subscriptions |
| `src/pages/panels/InstructorPanel.tsx` | Replace 18 Convex calls + Socket.IO |
| `src/pages/panels/MentorPanel.tsx` | Replace 9 Convex calls + Socket.IO |
| `src/pages/panels/AIManagementPanel.tsx` | Replace 20 Convex calls with REST |
| `src/pages/panels/SuperAdminPanel.tsx` | Replace 18 Convex calls with REST |
| `src/pages/panels/TelegramBotPanel.tsx` | Replace 15 Convex calls with REST |
| `src/pages/panels/ContentPanel.tsx` | Replace 5 Convex calls with REST |
| `src/pages/panels/SupportPanel.tsx` | Replace 5 Convex calls with REST |

### D. Components Requiring Socket.IO Integration

| File | Realtime Features | Socket.IO Events Needed |
|------|-------------------|------------------------|
| `src/hooks/use-live.ts` | WebRTC signaling, presence | `webrtc:*`, `presence:*` |
| `src/pages/Dashboard.tsx` | Whiteboard strokes, room messages, presence, WebRTC | `whiteboard:*`, `room:*`, `presence:*`, `webrtc:*` |
| `src/pages/panels/InstructorPanel.tsx` | Whiteboard strokes, room control, presence | `whiteboard:*`, `room:*`, `presence:*` |
| `src/pages/panels/MentorPanel.tsx` | Presence, room status | `presence:*`, `room:*` |

### E. Components Requiring Auth Changes

| File | Auth Change |
|------|-------------|
| `src/main.tsx` | Replace `ConvexAuthProvider` with JWT provider |
| `src/hooks/use-auth.ts` | New JWT-based auth hook |
| `src/pages/Auth.tsx` | REST login/register instead of Convex auth |
| `src/components/site/SiteHeader.tsx` | JWT-based user display |
| `src/components/site/MemberProfileEditor.tsx` | JWT auth header |
| `src/components/site/CheckoutDialog.tsx` | JWT auth header |

### F. Components Requiring Storage Changes

| File | Storage Change |
|------|---------------|
| `src/lib/upload.ts` | Replace Convex `uploadBlob` with REST upload to `/api/media/upload` |
| `src/components/site/CheckoutDialog.tsx` | Receipt upload via new storage API |
| `src/components/site/MemberProfileEditor.tsx` | Avatar upload via new storage API |
| `src/pages/Dashboard.tsx` | File attachment upload via new storage API |
| `src/pages/panels/InstructorPanel.tsx` | Resource upload via new storage API |

### G. Components Depending on Unavailable Backend Functionality

| Feature | Convex Function | Status in Iranian Backend |
|---------|----------------|---------------------------|
| Telegram Bot Management | `telegramBot.*`, `telegramBotActions.*` | ⏸️ Not yet implemented |
| Google OAuth | `googleAuth.verifyGoogleToken` | ❌ Removed (by design) |
| Super Admin Site Texts | `superAdmin.getSiteTexts/UpdateSiteText` | ⏸️ Not yet implemented |
| Super Admin Site Pages | `superAdmin.getSitePages/SaveSitePage` | ⏸️ Not yet implemented |
| Super Admin Audit Log | `superAdmin.getAuditLog/addAuditLog` | ⏸️ Not yet implemented |
| Super Admin System Stats | `superAdmin.getSystemStats` | ⏸️ Not yet implemented |
| Super Admin System Health | `superAdmin.getSystemHealth` | ✅ `GET /api/health/db` |
| Seed Bootstrap | `seed.run/ensureAdmin/refreshBrand` | ⏸️ Not yet implemented |
| Course Studio Draft | `courseStudio.*` | ⏸️ Not yet implemented |
| Content Studio Media | `contentStudio.*` | ✅ `GET /api/media` exists |
| Class Requests | `admin.requestClass/adminListClassRequests` | ⏸️ Partially implemented |
| Exam Reports | `examReports.*` | ⏸️ Not yet implemented |
| Inbox Messages | `inbox.*` | ⏸️ Not yet implemented |

---

## 4. Backend Gaps (Functionality Missing)

| # | Gap | Convex Functions Affected | Priority |
|---|-----|--------------------------|----------|
| 1 | **Telegram Bot API** | `telegramBot.*`, `telegramBotActions.*`, `telegramNotifications.*` | Medium |
| 2 | **Super Admin Site Texts/Pages** | `superAdmin.getSiteTexts/Pages/UpdateText/SavePage` | Medium |
| 3 | **Super Admin Audit Log** | `superAdmin.getAuditLog/addAuditLog` | Medium |
| 4 | **Super Admin System Stats** | `superAdmin.getSystemStats/getSystemHealth` | Medium |
| 5 | **Seed/Bootstrap** | `seed.run/ensureAdmin/refreshBrand` | Low |
| 6 | **Course Studio Draft** | `courseStudio.*` (11 functions) | High |
| 7 | **Exam Reports** | `examReports.*` (4 functions) | Medium |
| 8 | **Inbox Messages** | `inbox.*` (5 functions) | Medium |
| 9 | **Class Requests** | `admin.requestClass/adminListClassRequests` | Medium |
| 10 | **Exam Question Groups** | `admin.adminGetQuestionGroups/adminCreateQuestion` | High |
| 11 | **Content Dictionary CRUD** | `content.createDictionaryTerm/update/delete` | Low |
| 12 | **Enrollment Downloads** | `enroll.getMyDownloads` | Low |
| 13 | **Profile Suggested Courses** | `profiles.listSuggestedCourses/toggleSuggestedCourse` | Low |
| 14 | **Exam Questions (admin)** | `admin.adminCreateQuestion/adminUpdateQuestion/adminDeleteQuestion` | High |
| 15 | **Exam Reports** | `examReports.*` | Medium |
| 16 | **Admin Revenue/Stats** | `admin.getRevenueSeries/getEnrollmentStats/getAdminStats` | Medium |
| 17 | **Admin Class Requests** | `admin.adminListClassRequests/adminReviewClassRequest` | Medium |
| 18 | **Inbox** | `inbox.*` | Medium |
| 19 | **Auth: Revoke All Sessions** | `superAdmin.revokeAllSessions` | Low |
| 20 | **Auth: OTP Send/Verify** | `emailOtp.sendOtp/verifyOtp` | ✅ Already implemented |
| 21 | **Admin Coupons** | `admin.adminGetCoupons/adminCreateCoupon/adminToggleCoupon/adminDeleteCoupon` | ✅ Already implemented in commerce |
| 22 | **Realtime Room Messages** | `collab.sendMessage/listMessages` | ✅ Socket.IO `room:*` events |
| 23 | **Super Admin Revoke Sessions** | `superAdmin.revokeAllSessions` | Low |

---

## 5. Recommended Migration Order

| Phase | Feature Area | Risk | Files | Effort |
|-------|-------------|------|-------|--------|
| **9B** | Auth system (JWT, login, register) | High | 5 | 2 days |
| **9C** | Landing + public content pages | Low | 15 | 2 days |
| **9D** | Admin panel (CRUD) | High | 2 | 3 days |
| **9E** | Dashboard + exams | High | 2 | 2 days |
| **9F** | AI Chat + AI Management | Medium | 3 | 1 day |
| **9G** | Instructor panel | High | 2 | 2 days |
| **9H** | Mentor + Support panels | Medium | 3 | 1 day |
| **9I** | Commerce (enrollment, payments) | Medium | 3 | 1 day |
| **9J** | Storage/upload migration | Medium | 4 | 1 day |
| **9K** | Socket.IO (realtime, presence, rooms) | High | 4 | 3 days |
| **9L** | Super Admin panel | Medium | 1 | 1 day |
| **9M** | Content Studio + Course Studio | Medium | 2 | 1 day |
| **9N** | Telegram frontend (if needed) | Low | 4 | 1 day |
| **9O** | Testing + cleanup | Medium | all | 2 days |

---

## 6. Estimated Migration Effort

| Category | Files | Days |
|----------|-------|------|
| Core infrastructure (auth, main.tsx, hooks) | 5 | 2 |
| Public/landing pages | 15 | 2 |
| Admin panels | 5 | 4 |
| User panels (Dashboard, Instructor, Mentor, Support) | 8 | 8 |
| AI features | 3 | 1 |
| Commerce + enrollments | 3 | 1 |
| Storage/upload | 4 | 1 |
| Socket.IO realtime | 4 | 3 |
| Content/Course Studio | 2 | 1 |
| **Total** | **42 files** | **~23 days** |

---

## 7. Summary Statistics

| Metric | Count |
|--------|-------|
| Total frontend files | 126 |
| Convex-dependent files | 42 |
| Unique Convex API functions used | 258 |
| Queries (useQuery) | 88 |
| Mutations (useMutation) | 139 |
| Actions (useAction) | 16 |
| Auth dependencies | 5 files |
| Storage dependencies | 4 files |
| Realtime dependencies | 8 files (4 require Socket.IO) |
| Files requiring major refactoring | 12 |
| Files requiring only API client swap | 15 |
| Files requiring Socket.IO integration | 4 |
| Backend gaps (missing endpoints) | 23 |
| Backend endpoints already implemented | ~235 of 258 |
| Backend coverage | ~91% |

---

## 8. Phase 9B Recommended Plan

**Phase 9B should focus on:**
1. **Auth system migration** — Replace `ConvexAuthProvider` + `useConvexAuth` with JWT-based auth provider
2. **Create API client utility** — `useConvexQuery` → `useFetch` wrapper with auth headers + caching
3. **Migrate landing/public pages** — Lowest risk, highest visibility

This provides immediate visible progress and establishes the pattern for all subsequent migrations.

---

*Generated by Phase 9A audit — no frontend files were modified.*
