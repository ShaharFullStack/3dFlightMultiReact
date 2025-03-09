import { useForm } from "react-hook-form";
import "./Login.css";
import { CredentialsModel } from "../../../Models/CredentialsModel";
import { notify } from "../../../Utils/Notify";
import { userService } from "../../../Services/UserService";
import { useNavigate } from "react-router-dom";

export function Login(): JSX.Element {

    const { register, handleSubmit, formState: { errors } } = useForm<CredentialsModel>();
    const navigate = useNavigate();

    async function send(credentials: CredentialsModel) {
        try {
            await userService.login(credentials);
            notify.success("Welcome back!");
            const targetUrl = sessionStorage.getItem("targetUrl") || "/home";
            sessionStorage.removeItem("targetUrl");
            navigate(targetUrl);
        }
        catch (err: any) {
            const errorMessage = err.response?.data?.message || "Login failed. Please try again.";
            notify.error(errorMessage);
        }
    }

    return (
        <div className="Login">
            <form onSubmit={handleSubmit(send)}>
                <h2>Flight Simulator Login</h2>
                
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        {...register("email", {
                            required: "Email is required",
                            pattern: {
                                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                message: "Invalid email format"
                            }
                        })}
                    />
                    {errors.email && <span className="error-message">{errors.email.message}</span>}
                </div>
                
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        {...register("password", {
                            required: "Password is required",
                            minLength: {
                                value: 5,
                                message: "Password must be at least 6 characters"
                            }
                        })}
                    />
                    {errors.password && <span className="error-message">{errors.password.message}</span>}
                </div>
                
                <button type="submit" className="submit-button">Login</button>
                
                <div className="form-footer">
                    <p>Don't have an account? <a href="/register">Register</a></p>
                </div>
            </form>
        </div>
    );
}