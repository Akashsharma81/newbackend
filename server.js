
// import express from "express";
// import multer from "multer";
// import { exec } from "child_process";
// import path from "path";
// import fs from "fs";
// import { fileURLToPath } from "url";
// import cors from "cors";
// import mongoose from "mongoose";
// import dotenv from "dotenv";
// import conversionRoutes from "./routes/conversionRoutes.js";
// import conversion from "./model/conversion.js";

// dotenv.config();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const app = express();

// // Platform validation - only Windows and macOS supported
// const SUPPORTED_PLATFORMS = ['win32', 'darwin'];
// if (!SUPPORTED_PLATFORMS.includes(process.platform)) {
//   console.error(`❌ Unsupported platform: ${process.platform}. Only Windows and macOS supported.`);
//   process.exit(1);
// }

// // Directories
// const UPLOAD_DIR = path.join(__dirname, "uploads");
// const CONVERT_DIR = path.join(__dirname, "converted");

// // Ensure directories exist
// if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// if (!fs.existsSync(CONVERT_DIR)) fs.mkdirSync(CONVERT_DIR, { recursive: true });

// // Multer setup
// const upload = multer({ 
//   dest: UPLOAD_DIR,
//   limits: { fileSize: 50 * 1024 * 1024 },
//   fileFilter: (req, file, cb) => {
//     const allowed = ['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword'];
//     cb(null, allowed.includes(file.mimetype));
//   }
// });

// app.use(cors({ origin: "*", methods: ["GET","POST", "DELETE"], credentials:true }));

// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ extended:true, limit:'50mb' }));

// // Python & LibreOffice paths
// const pythonPath = "C:\\Users\\~Akash~\\AppData\\Local\\Programs\\Python\\Python313\\python.exe";
// const libreOfficePath = "C:\\Program Files\\LibreOffice\\program\\soffice.com";

// const CONVERT_SCRIPT = path.join(__dirname, "convert.py");

// // Verify dependencies
// const verifyDependencies = async () => new Promise((resolve,reject)=>{
//   exec(`"${pythonPath}" --version`, (err,stdout)=> {
//     if(err) return reject(new Error("Python missing"));
//     console.log("✅ Python:", stdout.trim());

//     exec(`"${libreOfficePath}" --version`, (err,stdout)=> {
//       if(err) return reject(new Error("LibreOffice missing"));
//       console.log("✅ LibreOffice:", stdout.trim());
//       resolve();
//     });
//   });
// });

// // MongoDB
// const connectMongoDB = async () => {
//   try {
//     const MONGO_URI = process.env.MONGO_URI;
//     if(!MONGO_URI) throw new Error("MONGO_URI required");
//     await mongoose.connect(MONGO_URI);
//     console.log("✅ MongoDB connected");
//   } catch(e){ console.error(e.message); throw e; }
// };

// // Routes
// app.use("/api/history", conversionRoutes);
// app.use("/api/conversions", conversionRoutes);

// // Health check
// app.get('/health',(req,res)=>res.json({status:'OK', platform:process.platform, timestamp:new Date().toISOString()}));

// // Conversion endpoint
// app.post("/convert", upload.single("file"), async (req,res)=>{
//   const { toType } = req.body;
//   if(!req.file) return res.status(400).json({error:"No file uploaded"});
//   if(!['pdf','docx'].includes(toType)) return res.status(400).json({error:"Invalid type"});

//   const inputPath = req.file.path;
//   const timestamp = Date.now();
//   const outputExt = toType === "pdf" ? "pdf":"docx";
//   const outputFileName = `converted_${timestamp}.${outputExt}`;
//   const outputPath = path.join(CONVERT_DIR, outputFileName);
//   try {
//     let cmd = "";
//     if(toType==="docx"){
//       if(!fs.existsSync(CONVERT_SCRIPT)) throw new Error("Python conversion script missing");
//       cmd = `"${pythonPath}" "${CONVERT_SCRIPT}" "${inputPath}" "${outputPath}"`;
//     } else {
//       cmd = `"${libreOfficePath}" --headless /NoSplash --convert-to pdf --outdir "${CONVERT_DIR}" "${inputPath}"`;
//     }

//     console.log("🔄 Executing:", cmd);
//     exec(cmd, {timeout:60000}, async (err,stdout,stderr)=>{
//       if(err) return res.status(500).json({error:"Conversion failed", details:err.message});

//       if(toType==="pdf"){
//         const origName = path.basename(inputPath,path.extname(inputPath));
//         const loOut = path.join(CONVERT_DIR, `${origName}.pdf`);
//         if(fs.existsSync(loOut)) fs.renameSync(loOut, outputPath);
//       }

//       if(!fs.existsSync(outputPath)) return res.status(500).json({error:"Output file not found"});

//       // Save DB record
//       try{
//         const newRecord = new conversion({
//           originalName:req.file.originalname,
//           convertedName:path.basename(outputPath),
//           fromType:req.file.mimetype,
//           toType,
//           downloadUrl:`/downloads/${path.basename(outputPath)}`,
//           createdAt:new Date()
//         });
//         await newRecord.save();
//       }catch(e){ console.error("DB save error:",e.message); }

//       // Send file
//       res.download(outputPath, `converted_${req.file.originalname}.${outputExt}`, (dErr)=>{
//         setTimeout(()=>{
//           try{
//             if(fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
//             if(fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
//           }catch(e){ console.error("Cleanup error:",e.message); }
//         },5000);
//         if(dErr) console.error("Download error:",dErr.message);
//       });
//     });

//   } catch(e){
//     console.error("Conversion setup error:", e.message);
//     if(fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
//     res.status(500).json({error:"Conversion setup failed"});
//   }
// });

// // Error & 404 handling
// app.use((err,req,res,next)=>{
//   if(err instanceof multer.MulterError && err.code==='LIMIT_FILE_SIZE') return res.status(400).json({error:"File too large"});
//   console.error("Unhandled error:", err.message);
//   res.status(500).json({error:"Internal server error"});
// });
// app.use((req,res)=>res.status(404).json({error:"Route not found"}));

// // Start server
// const startServer = async ()=>{
//   try{
//     console.log("🖥️ Platform:", process.platform);
//     await verifyDependencies();
//     await connectMongoDB();

//     const PORT = process.env.PORT || 5000;
//     app.listen(PORT,()=>console.log(`✅ Server running on port ${PORT}`));
//   }catch(e){ console.error("❌ Failed to start server:",e.message); process.exit(1);}
// };

// // Graceful shutdown
// process.on('SIGINT',()=>{ mongoose.connection.close(); process.exit(0); });
// process.on('SIGTERM',()=>{ mongoose.connection.close(); process.exit(0); });

// startServer();





// import express from "express";
// import multer from "multer";
// import { exec } from "child_process";
// import path from "path";
// import fs from "fs";
// import { fileURLToPath } from "url";
// import cors from "cors";
// import mongoose from "mongoose";
// import dotenv from "dotenv";
// import conversionRoutes from "./routes/conversionRoutes.js";
// import conversion from "./model/conversion.js";

// dotenv.config();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const app = express();

// // Platform validation - only Windows and macOS supported
// const SUPPORTED_PLATFORMS = ['win32', 'darwin', 'linux'];
// if (!SUPPORTED_PLATFORMS.includes(process.platform)) {
//   console.error(`❌ Unsupported platform: ${process.platform}.`);
//   process.exit(1);
// }

// // Directories
// const UPLOAD_DIR = path.join(__dirname, "uploads");
// const CONVERT_DIR = path.join(__dirname, "converted");

// // Ensure directories exist
// if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// if (!fs.existsSync(CONVERT_DIR)) fs.mkdirSync(CONVERT_DIR, { recursive: true });

// // Multer setup
// const upload = multer({ 
//   dest: UPLOAD_DIR,
//   limits: { fileSize: 50 * 1024 * 1024 },
//   fileFilter: (req, file, cb) => {
//     const allowed = ['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword'];
//     cb(null, allowed.includes(file.mimetype));
//   }
// });

// app.use(cors({ origin: "*", methods: ["GET","POST", "DELETE"], credentials:true }));

// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ extended:true, limit:'50mb' }));

// // Python & LibreOffice paths
// // const pythonPath = "C:\\Users\\~Akash~\\AppData\\Local\\Programs\\Python\\Python313\\python.exe";

// const pythonPath = process.platform === "win32"
//   ? "C:\\Users\\~Akash~\\AppData\\Local\\Programs\\Python\\Python313\\python.exe"
//   : "python3"; 

// // const libreOfficePath = "C:\\Program Files\\LibreOffice\\program\\soffice.com";
// const libreOfficePath = process.platform === "win32"
//   ? "C:\\Program Files\\LibreOffice\\program\\soffice.com"
//   : "soffice";

// const CONVERT_SCRIPT = path.join(__dirname, "convert.py");

// // Verify dependencies
// const verifyDependencies = async () => new Promise((resolve,reject)=>{
//   exec(`"${pythonPath}" --version`, (err,stdout)=> {
//     if(err) return reject(new Error("Python missing"));
//     console.log("✅ Python:", stdout.trim());

//     exec(`"${libreOfficePath}" --version`, (err,stdout)=> {
//       if(err) return reject(new Error("LibreOffice missing"));
//       console.log("✅ LibreOffice:", stdout.trim());
//       resolve();
//     });
//   });
// });

// // MongoDB
// const connectMongoDB = async () => {
//   try {
//     const MONGO_URI = process.env.MONGO_URI;
//     if(!MONGO_URI) throw new Error("MONGO_URI required");
//     await mongoose.connect(MONGO_URI);
//     console.log("✅ MongoDB connected");
//   } catch(e){ console.error(e.message); throw e; }
// };

// // Routes
// app.use("/api/history", conversionRoutes);
// app.use("/api/conversions", conversionRoutes);

// // Health check
// app.get('/health',(req,res)=>res.json({status:'OK', platform:process.platform, timestamp:new Date().toISOString()}));

// // Conversion endpoint
// app.post("/convert", upload.single("file"), async (req,res)=>{
//   const { toType } = req.body;
//   if(!req.file) return res.status(400).json({error:"No file uploaded"});
//   if(!['pdf','docx'].includes(toType)) return res.status(400).json({error:"Invalid type"});

//   const inputPath = req.file.path;
//   const timestamp = Date.now();
//   const outputExt = toType === "pdf" ? "pdf":"docx";
//   const outputFileName = `converted_${timestamp}.${outputExt}`;
//   const outputPath = path.join(CONVERT_DIR, outputFileName);
//   try {
//     let cmd = "";
//     if(toType==="docx"){
//       if(!fs.existsSync(CONVERT_SCRIPT)) throw new Error("Python conversion script missing");
//       cmd = `"${pythonPath}" "${CONVERT_SCRIPT}" "${inputPath}" "${outputPath}"`;
//     } else {
//       cmd = `"${libreOfficePath}" --headless /NoSplash --convert-to pdf --outdir "${CONVERT_DIR}" "${inputPath}"`;
//     }

//     console.log("🔄 Executing:", cmd);
//     exec(cmd, {timeout:60000}, async (err,stdout,stderr)=>{
//       if(err) return res.status(500).json({error:"Conversion failed", details:err.message});

//       if(toType==="pdf"){
//         const origName = path.basename(inputPath,path.extname(inputPath));
//         const loOut = path.join(CONVERT_DIR, `${origName}.pdf`);
//         if(fs.existsSync(loOut)) fs.renameSync(loOut, outputPath);
//       }

//       if(!fs.existsSync(outputPath)) return res.status(500).json({error:"Output file not found"});

//       // Save DB record
//       try{
//         const newRecord = new conversion({
//           originalName:req.file.originalname,
//           convertedName:path.basename(outputPath),
//           fromType:req.file.mimetype,
//           toType,
//           downloadUrl:`/downloads/${path.basename(outputPath)}`,
//           createdAt:new Date()
//         });
//         await newRecord.save();
//       }catch(e){ console.error("DB save error:",e.message); }

//       // Send file
//       res.download(outputPath, `converted_${req.file.originalname}.${outputExt}`, (dErr)=>{
//         setTimeout(()=>{
//           try{
//             if(fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
//             if(fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
//           }catch(e){ console.error("Cleanup error:",e.message); }
//         },5000);
//         if(dErr) console.error("Download error:",dErr.message);
//       });
//     });

//   } catch(e){
//     console.error("Conversion setup error:", e.message);
//     if(fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
//     res.status(500).json({error:"Conversion setup failed"});
//   }
// });

// // Error & 404 handling
// app.use((err,req,res,next)=>{
//   if(err instanceof multer.MulterError && err.code==='LIMIT_FILE_SIZE') return res.status(400).json({error:"File too large"});
//   console.error("Unhandled error:", err.message);
//   res.status(500).json({error:"Internal server error"});
// });
// app.use((req,res)=>res.status(404).json({error:"Route not found"}));

// // Start server
// const startServer = async ()=>{
//   try{
//     console.log("🖥️ Platform:", process.platform);
//     await verifyDependencies();
//     await connectMongoDB();

//     const PORT = process.env.PORT || 5000;
//     app.listen(PORT,()=>console.log(`✅ Server running on port ${PORT}`));
//   }catch(e){ console.error("❌ Failed to start server:",e.message); process.exit(1);}
// };

// // Graceful shutdown
// process.on('SIGINT',()=>{ mongoose.connection.close(); process.exit(0); });
// process.on('SIGTERM',()=>{ mongoose.connection.close(); process.exit(0); });

// startServer();


// //3
// import express from "express";
// import multer from "multer";
// import { exec } from "child_process";
// import path from "path";
// import fs from "fs";
// import { fileURLToPath } from "url";
// import cors from "cors";
// import mongoose from "mongoose";
// import dotenv from "dotenv";
// import conversionRoutes from "./routes/conversionRoutes.js";
// import conversion from "./model/conversion.js";

// dotenv.config();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const app = express();

// // Platform validation
// const SUPPORTED_PLATFORMS = ['win32', 'darwin', 'linux'];
// if (!SUPPORTED_PLATFORMS.includes(process.platform)) {
//   console.error(`❌ Unsupported platform: ${process.platform}.`);
//   process.exit(1);
// }

// // Directories
// const UPLOAD_DIR = path.join(__dirname, "uploads");
// const CONVERT_DIR = path.join(__dirname, "converted");

// // Ensure directories exist
// if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// if (!fs.existsSync(CONVERT_DIR)) fs.mkdirSync(CONVERT_DIR, { recursive: true });

// // Multer setup
// const upload = multer({ 
//   dest: UPLOAD_DIR,
//   limits: { fileSize: 50 * 1024 * 1024 },
//   fileFilter: (req, file, cb) => {
//     const allowed = [
//       'application/pdf',
//       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//       'application/msword'
//     ];
//     cb(null, allowed.includes(file.mimetype));
//   }
// });

// app.use(cors({ origin: "*", methods: ["GET","POST", "DELETE"], credentials:true }));
// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ extended:true, limit:'50mb' }));

// // Python & LibreOffice paths
// const pythonPath = process.platform === "win32"
//   ? "C:\\Users\\~Akash~\\AppData\\Local\\Programs\\Python\\Python313\\python.exe"
//   : "python3"; 

// const libreOfficePath = process.platform === "win32"
//   ? "C:\\Program Files\\LibreOffice\\program\\soffice.com"
//   : "soffice";

// const CONVERT_SCRIPT = path.join(__dirname, "convert.py");

// // Verify dependencies (LibreOffice check removed)
// const verifyDependencies = async () => new Promise((resolve,reject)=>{
//   exec(`"${pythonPath}" --version`, (err,stdout)=> {
//     if(err) return reject(new Error("Python missing"));
//     console.log("✅ Python:", stdout.trim());
//     resolve();
//   });
// });

// // MongoDB
// const connectMongoDB = async () => {
//   try {
//     const MONGO_URI = process.env.MONGO_URI;
//     if(!MONGO_URI) throw new Error("MONGO_URI required");
//     await mongoose.connect(MONGO_URI);
//     console.log("✅ MongoDB connected");
//   } catch(e){ console.error(e.message); throw e; }
// };

// // Routes
// app.use("/api/history", conversionRoutes);
// app.use("/api/conversions", conversionRoutes);

// // Health check
// app.get('/health',(req,res)=>
//   res.json({status:'OK', platform:process.platform, timestamp:new Date().toISOString()})
// );

// // Conversion endpoint
// app.post("/convert", upload.single("file"), async (req,res)=>{
//   const { toType } = req.body;
//   if(!req.file) return res.status(400).json({error:"No file uploaded"});
//   if(!['pdf','docx'].includes(toType)) return res.status(400).json({error:"Invalid type"});

//   const inputPath = req.file.path;
//   const timestamp = Date.now();
//   const outputExt = toType === "pdf" ? "pdf":"docx";
//   const outputFileName = `converted_${timestamp}.${outputExt}`;
//   const outputPath = path.join(CONVERT_DIR, outputFileName);

//   try {
//     let cmd = "";
//     if(toType==="docx"){
//       if(!fs.existsSync(CONVERT_SCRIPT)) throw new Error("Python conversion script missing");
//       cmd = `"${pythonPath}" "${CONVERT_SCRIPT}" "${inputPath}" "${outputPath}"`;
//     } else {
//       cmd = `"${libreOfficePath}" --headless --nologo --convert-to pdf --outdir "${CONVERT_DIR}" "${inputPath}"`;
//     }

//     console.log("🔄 Executing:", cmd);
//     exec(cmd, {timeout:60000}, async (err,stdout,stderr)=>{
//       if(err) return res.status(500).json({error:"Conversion failed", details:err.message});

//       if(toType==="pdf"){
//         const origName = path.basename(inputPath,path.extname(inputPath));
//         const loOut = path.join(CONVERT_DIR, `${origName}.pdf`);
//         if(fs.existsSync(loOut)) fs.renameSync(loOut, outputPath);
//       }

//       if(!fs.existsSync(outputPath)) return res.status(500).json({error:"Output file not found"});

//       // Save DB record
//       try{
//         const newRecord = new conversion({
//           originalName:req.file.originalname,
//           convertedName:path.basename(outputPath),
//           fromType:req.file.mimetype,
//           toType,
//           downloadUrl:`/downloads/${path.basename(outputPath)}`,
//           createdAt:new Date()
//         });
//         await newRecord.save();
//       }catch(e){ console.error("DB save error:",e.message); }

//       // Send file
//       res.download(outputPath, `converted_${req.file.originalname}.${outputExt}`, (dErr)=>{
//         setTimeout(()=>{
//           try{
//             if(fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
//             if(fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
//           }catch(e){ console.error("Cleanup error:",e.message); }
//         },5000);
//         if(dErr) console.error("Download error:",dErr.message);
//       });
//     });

//   } catch(e){
//     console.error("Conversion setup error:", e.message);
//     if(fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
//     res.status(500).json({error:"Conversion setup failed"});
//   }
// });

// // Error & 404 handling
// app.use((err,req,res,next)=>{
//   if(err instanceof multer.MulterError && err.code==='LIMIT_FILE_SIZE') 
//     return res.status(400).json({error:"File too large"});
//   console.error("Unhandled error:", err.message);
//   res.status(500).json({error:"Internal server error"});
// });
// app.use((req,res)=>res.status(404).json({error:"Route not found"}));

// // Start server
// const startServer = async ()=>{
//   try{
//     console.log("🖥️ Platform:", process.platform);
//     await verifyDependencies();
//     await connectMongoDB();

//     const PORT = process.env.PORT || 5000;
//     app.listen(PORT,()=>console.log(`✅ Server running on port ${PORT}`));
//   }catch(e){ 
//     console.error("❌ Failed to start server:",e.message); 
//     process.exit(1);
//   }
// };

// // Graceful shutdown
// process.on('SIGINT',()=>{ mongoose.connection.close(); process.exit(0); });
// process.on('SIGTERM',()=>{ mongoose.connection.close(); process.exit(0); });

// startServer();


//4 ye niche ka code pdf to doc me work kar raha hai
// import express from "express";
// import multer from "multer";
// import { exec } from "child_process";
// import path from "path";
// import fs from "fs";
// import { fileURLToPath } from "url";
// import cors from "cors";
// import mongoose from "mongoose";
// import dotenv from "dotenv";
// import conversionRoutes from "./routes/conversionRoutes.js";
// import conversion from "./model/conversion.js";

// dotenv.config();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const app = express();

// // Directories
// const UPLOAD_DIR = path.join(__dirname, "uploads");
// const CONVERT_DIR = path.join(__dirname, "converted");
// if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// if (!fs.existsSync(CONVERT_DIR)) fs.mkdirSync(CONVERT_DIR, { recursive: true });

// // Multer
// const upload = multer({ 
//   dest: UPLOAD_DIR,
//   limits: { fileSize: 50 * 1024 * 1024 },
//   fileFilter: (req, file, cb) => {
//     const allowed = ['application/pdf'];
//     cb(null, allowed.includes(file.mimetype));
//   }
// });

// app.use(cors({ origin: "*", methods: ["GET","POST","DELETE"], credentials:true }));
// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ extended:true, limit:'50mb' }));

// // MongoDB
// const connectMongoDB = async () => {
//   try {
//     const MONGO_URI = process.env.MONGO_URI;
//     if(!MONGO_URI) throw new Error("MONGO_URI required");
//     await mongoose.connect(MONGO_URI);
//     console.log("✅ MongoDB connected");
//   } catch(e){ 
//     console.error(e.message); 
//     throw e; 
//   }
// };

// // Routes
// app.use("/api/history", conversionRoutes);
// app.use("/api/conversions", conversionRoutes);

// // Health check
// app.get("/health", (req,res) => res.json({ status:"OK", timestamp: new Date().toISOString() }));

// // Conversion endpoint
// app.post("/convert", upload.single("file"), async (req,res)=>{
//   const inputPath = req.file?.path;
//   if(!inputPath) return res.status(400).json({error:"No file uploaded"});

//   const timestamp = Date.now();
//   const outputFileName = `converted_${timestamp}.docx`;
//   const outputPath = path.join(CONVERT_DIR, outputFileName);

//   try {
//     // Use python3 in Docker/Render environment
//     const cmd = `python3 "${path.join(__dirname,"convert.py")}" "${inputPath}" "${outputPath}"`;
//     console.log("🔄 Executing:", cmd);

//     exec(cmd, { timeout: 60000 }, async (err, stdout, stderr) => {
//       if(err){
//         console.error("Conversion error:", stderr || err.message);
//         return res.status(500).json({error:"Conversion failed", details: stderr || err.message});
//       }

//       if(!fs.existsSync(outputPath)){
//         console.error("Output file missing after conversion");
//         return res.status(500).json({error:"Output file not found"});
//       }

//       // Save record in DB
//       try{
//         const newRecord = new conversion({
//           originalName: req.file.originalname,
//           convertedName: path.basename(outputPath),
//           fromType: req.file.mimetype,
//           toType: "docx",
//           downloadUrl: `/downloads/${path.basename(outputPath)}`,
//           createdAt: new Date()
//         });
//         await newRecord.save();
//       }catch(e){ console.error("DB save error:", e.message); }

//       // Send file
//       res.download(outputPath, `converted_${req.file.originalname}.docx`, ()=>{
//         setTimeout(()=>{
//           try{
//             if(fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
//             if(fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
//           }catch(e){ console.error("Cleanup error:", e.message); }
//         },5000);
//       });
//     });

//   } catch(e){
//     console.error("Setup error:", e.message);
//     if(fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
//     res.status(500).json({error:"Conversion setup failed"});
//   }
// });

// // Start server
// const PORT = process.env.PORT || 5000;
// connectMongoDB()
// .then(()=> app.listen(PORT, ()=>console.log(`✅ Server running on port ${PORT}`)))
// .catch(err => console.error("❌ Server start failed:", err.message));



//5ye new hai
import express from "express";
import multer from "multer";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import conversionRoutes from "./routes/conversionRoutes.js";
import conversion from "./model/conversion.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Directories
const UPLOAD_DIR = path.join(__dirname, "uploads");
const CONVERT_DIR = path.join(__dirname, "converted");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(CONVERT_DIR)) fs.mkdirSync(CONVERT_DIR, { recursive: true });

// Multer setup
const upload = multer({ 
  dest: UPLOAD_DIR,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    cb(null, allowed.includes(file.mimetype));
  }
});

app.use(cors({ origin: "*", methods: ["GET","POST","DELETE"], credentials:true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended:true, limit:'50mb' }));

// MongoDB
const connectMongoDB = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    if(!MONGO_URI) throw new Error("MONGO_URI required");
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch(e){ console.error(e.message); throw e; }
};

// Routes
app.use("/api/history", conversionRoutes);
app.use("/api/conversions", conversionRoutes);

// Health check
app.get("/health", (req,res) => res.json({ status:"OK", timestamp: new Date().toISOString() }));

// Conversion endpoint
app.post("/convert", upload.single("file"), async (req,res)=>{
  const inputPath = req.file?.path;
  if(!inputPath) return res.status(400).json({error:"No file uploaded"});

  const { toType } = req.body;
  if(!toType || !["docx","pdf"].includes(toType)) 
    return res.status(400).json({error:"Invalid conversion type"});

  const timestamp = Date.now();
  const ext = toType;
  const outputFileName = `converted_${timestamp}.${ext}`;
  const outputPath = path.join(CONVERT_DIR, outputFileName);

  try {
    let cmd = "";
    if(toType === "docx"){
      // PDF -> DOCX
      cmd = `python3 "${path.join(__dirname,"convert.py")}" "${inputPath}" "${outputPath}"`;
    } else if(toType === "pdf"){
      // DOCX -> PDF using LibreOffice
      cmd = `soffice --headless --convert-to pdf --outdir "${CONVERT_DIR}" "${inputPath}"`;
    }

    console.log("🔄 Executing:", cmd);

    exec(cmd, { timeout: 60000 }, async (err, stdout, stderr) => {
      if(err){
        console.error("Conversion error:", stderr || err.message);
        return res.status(500).json({error:"Conversion failed", details: stderr || err.message});
      }

      let finalOutputPath = outputPath;
      if(toType === "pdf"){
        const pdfName = path.basename(inputPath, path.extname(inputPath)) + ".pdf";
        finalOutputPath = path.join(CONVERT_DIR, pdfName);
        if(fs.existsSync(finalOutputPath)){
          fs.renameSync(finalOutputPath, outputPath);
        } else {
          return res.status(500).json({error:"Output PDF not found"});
        }
      }

      // Save record in DB
      try{
        const newRecord = new conversion({
          originalName: req.file.originalname,
          convertedName: path.basename(outputPath),
          fromType: req.file.mimetype,
          toType,
          downloadUrl: `/downloads/${path.basename(outputPath)}`,
          createdAt: new Date()
        });
        await newRecord.save();
      }catch(e){ console.error("DB save error:", e.message); }

      // Send file
      res.download(outputPath, `converted_${req.file.originalname}.${ext}`, ()=>{
        setTimeout(()=>{
          try{
            if(fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if(fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
          }catch(e){ console.error("Cleanup error:", e.message); }
        },5000);
      });
    });

  } catch(e){
    console.error("Setup error:", e.message);
    if(fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    res.status(500).json({error:"Conversion setup failed"});
  }
});

// Start server
const PORT = process.env.PORT || 5000;
connectMongoDB()
.then(()=> app.listen(PORT, ()=>console.log(`✅ Server running on port ${PORT}`)))
.catch(err => console.error("❌ Server start failed:", err.message));
