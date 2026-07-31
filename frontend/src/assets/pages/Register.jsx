import "../styles/Auth.css";
import { useState } from "react";

function Register() {

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = (e) => {
    e.preventDefault();

    console.log("Register");

    console.log(form);
  };

  return (
    <div className="container mt-5">

      <h2>Create Account</h2>

      <form onSubmit={handleRegister}>

        <div className="mb-3">
          <label>Full Name</label>

          <input
            name="name"
            className="form-control"
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label>Email</label>

          <input
            name="email"
            type="email"
            className="form-control"
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label>Password</label>

          <input
            name="password"
            type="password"
            className="form-control"
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label>Confirm Password</label>

          <input
            name="confirmPassword"
            type="password"
            className="form-control"
            onChange={handleChange}
          />
        </div>

        <button className="btn btn-success">
          Register
        </button>

      </form>

    </div>
  );
}

export default Register;