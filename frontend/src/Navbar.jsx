import { Link } from "react-router-dom";

function Navbar() {

  return (

    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">

      <div className="container">

        <Link className="navbar-brand" to="/">
          InterviewCoach AI
        </Link>

        <div>

          <Link
            className="btn btn-outline-light me-2"
            to="/login"
          >
            Login
          </Link>

          <Link
            className="btn btn-outline-light me-2"
            to="/register"
          >
            Register
          </Link>

          <Link
            className="btn btn-danger"
            to="/logout"
          >
            Logout
          </Link>

        </div>

      </div>

    </nav>

  );
}

export default Navbar;