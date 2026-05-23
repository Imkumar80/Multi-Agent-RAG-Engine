require("dotenv").config({ override: true });
import express, { Response, Request, NextFunction } from "express"
import http from "http"
import cors from "cors"
import cookieParser from "cookie-parser"
import authRouter from "./router/authRouter"
import userRouter from "./router/userRouter"
import chatRouter from "./router/chatRouter"
import { initChatSocket } from "./socket/chatSocket"

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const defaultOrigins = [
	"http://localhost:5173",
	"http://127.0.0.1:5173"
]
const clientOrigins = process.env.CLIENT_URL
	? process.env.CLIENT_URL.split(",").map(origin => origin.trim()).filter(Boolean)
	: defaultOrigins;

if (!PORT) { throw new Error("PORT environment variable not set properly") }

app.use(cors({
	origin: clientOrigins.length ? clientOrigins : true,
	credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static('assets'));

app.get("/hello", (req: Request, res: Response) => {
	res.send("Hello World")
})

app.use("/api/v1/auth", authRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/chat", chatRouter)

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
	console.error("\n\n\n\nUnhandled Error:", err);
	res.status(500).json({ msg: "Internal Server Error", success: false });
});

const server = http.createServer(app)
initChatSocket(server)

server.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});

server.on('error', (err: any) => {
	if (err.code === 'EADDRINUSE') {
		console.error(`Port ${PORT} is already in use. Please kill the other process or use a different port.`);
	} else {
		console.error('Server error:', err);
	}
});

export default app;
