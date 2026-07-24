function Logout() {

  const logout = () => {

    console.log("User Logged Out");

    // Later
    // Remove JWT Token
    // Redirect to Login Page

  };

  return (

    <div className="container mt-5">

      <h2>Logout</h2>

      <p>Click below to logout.</p>

      <button
        className="btn btn-danger"
        onClick={logout}
      >
        Logout
      </button>

    </div>

  );
}

export default Logout; 