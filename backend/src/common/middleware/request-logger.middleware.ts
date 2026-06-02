import morgan from "morgan";
import { env } from "../../config/env.js";

export const requestLogger = env.NODE_ENV === "development" ? morgan("dev") : morgan("combined");
