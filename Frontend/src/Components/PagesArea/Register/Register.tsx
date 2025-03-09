import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { UserModel } from "../../../Models/UserModel";
import { userService } from "../../../Services/UserService";
import { notify } from "../../../Utils/Notify";
import "./Register.css";

export function Register(): JSX.Element {

    const { register, handleSubmit, formState: { errors } } = useForm<UserModel>();
    const navigate = useNavigate();

    async function send(user: UserModel) {
        try {
            await userService.register(user);
            notify.success("Welcome " + user.firstName);
            navigate("/login");
        }
        catch(err: any) {
            notify.error(err);
        }
    }

    return (
        <div className="Register">
            <form onSubmit={handleSubmit(send)}>
                <h2>Create Your Account</h2>
                
                <div className="form-group">
                    <label htmlFor="firstName">First Name</label>
                    <input
                        id="firstName"
                        type="text"
                        {...register("firstName", {
                            required: "First name is required",
                            minLength: {
                                value: 2,
                                message: "First name must be at least 2 characters"
                            }
                        })}
                    />
                    {errors.firstName && <span className="error-message">{errors.firstName.message}</span>}
                </div>
                
                <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input
                        id="lastName"
                        type="text"
                        {...register("lastName", {
                            required: "Last name is required",
                            minLength: {
                                value: 2,
                                message: "Last name must be at least 2 characters"
                            }
                        })}
                    />
                    {errors.lastName && <span className="error-message">{errors.lastName.message}</span>}
                </div>
                
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
                                value: 6,
                                message: "Password must be at least 6 characters"
                            }
                        })}
                    />
                    {errors.password && <span className="error-message">{errors.password.message}</span>}
                </div>
                
                <button type="submit" className="submit-button">Register</button>
                
                <div className="form-footer">
                    <p>Already have an account? <a href="/login">Login</a></p>
                </div>
            </form>
        </div>
    );
}