  const handlePasswordLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("password", formData);
      navigate(redirect);
    } catch (error) {
      console.error("Password sign-in error:", error);
      setError("ورود ناموفق بود. ایمیل یا رمز عبور را بررسی کنید.");
      setIsLoading(false);
    }
  };
