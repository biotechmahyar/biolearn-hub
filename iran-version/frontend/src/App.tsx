import { BrowserRouter, Routes, Route } from "react-router";
import { Layout } from "@/components/Layout";
import Landing from "@/pages/Landing";
import Courses from "@/pages/Courses";
import CourseDetail from "@/pages/CourseDetail";
import Instructors from "@/pages/Instructors";
import InstructorDetail from "@/pages/InstructorDetail";
import Articles from "@/pages/Articles";
import ArticleDetail from "@/pages/ArticleDetail";
import Products from "@/pages/Products";
import Workshops from "@/pages/Workshops";
import Dictionary from "@/pages/Dictionary";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:slug" element={<CourseDetail />} />
          <Route path="/instructors" element={<Instructors />} />
          <Route path="/instructors/:slug" element={<InstructorDetail />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/articles/:slug" element={<ArticleDetail />} />
          <Route path="/products" element={<Products />} />
          <Route path="/workshops" element={<Workshops />} />
          <Route path="/dictionary" element={<Dictionary />} />
          <Route path="*" element={<div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">صفحه پیدا نشد</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
