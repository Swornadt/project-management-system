import multer from "multer";
import path from "path";
import fs from "fs";
import { file } from "zod";

const uploaddDir = path.join(process.cwd(),"uploads");
//create upload directory
if(!fs.existsSync(uploaddDir)){
  fs.mkdirSync(uploaddDir,{recursive:true});
}
const storage = multer.diskStorage({
  destination: (_req,_file,cb)=>{
    cb(null,uploaddDir);
  },
  filename: (_req,file,cb)=>{
    const extension = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null,uniqueName);
  }
});
export const upload = multer({
  storage,
  limits:{
    fileSize:5*1024*1024,
  },
});