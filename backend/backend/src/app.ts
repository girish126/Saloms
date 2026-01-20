import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import studentsRoutes from "./routes/Students/students";
import MasterdataRoutes from "./routes/Masterdata/MasterdataRoutes";
import reportRoutes from "./routes/Report/reportRoutes";
import allStudentsRoutes from "./routes/Allstudents/allstudents";
import dashboardRoutes from "./routes/Dashboard/dashboardRoutes";
import messagesRoutes from "./routes/Message/messagesRoutes";

 
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

app.use("/api/students", studentsRoutes);
app.use("/api/masterdata", MasterdataRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/all-students", allStudentsRoutes);  
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/messages", messagesRoutes);
app.get("/", (_req, res) => res.send("Server is running..."));

export default app;
