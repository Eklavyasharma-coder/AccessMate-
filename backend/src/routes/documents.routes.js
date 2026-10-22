const router=require('express').Router();
const multer=require('multer');const path=require('path');const crypto=require('crypto');const fs=require('fs');const fsp=require('fs/promises');
const controller=require('../controllers/document.controller');const {requireAuth}=require('../middleware/auth.middleware');
const uploadDir=path.join(__dirname,'..','..','uploads');fs.mkdirSync(uploadDir,{recursive:true});
const allowed=new Set(['.pdf','.doc','.docx','.txt','.png','.jpg','.jpeg','.webp','.bmp','.tif','.tiff']);
const storage=multer.diskStorage({destination:(_r,_f,cb)=>cb(null,uploadDir),filename:(_r,file,cb)=>cb(null,`${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)});
const upload=multer({storage,limits:{fileSize:Number(process.env.MAX_FILE_SIZE_MB||10)*1024*1024,files:1},fileFilter:(_r,file,cb)=>{const ext=path.extname(file.originalname).toLowerCase();if(!allowed.has(ext))return cb(new Error('Unsupported file type'));cb(null,true);}});
async function validateFileSignature(req,res,next){
 if(!req.file)return next();
 try{
  const handle=await fsp.open(req.file.path,'r');const buffer=Buffer.alloc(16);const {bytesRead}=await handle.read(buffer,0,buffer.length,0);await handle.close();const b=buffer.subarray(0,bytesRead);const ext=path.extname(req.file.originalname).toLowerCase();
  const signatures={
   '.pdf':()=>b.subarray(0,5).toString()==='%PDF-',
   '.png':()=>b.length>=8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
   '.jpg':()=>b.length>=3&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff,
   '.jpeg':()=>b.length>=3&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff,
   '.webp':()=>b.length>=12&&b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP',
   '.bmp':()=>b.length>=2&&b.subarray(0,2).toString()==='BM',
   '.tif':()=>b.length>=4&&((b[0]===0x49&&b[1]===0x49&&b[2]===0x2a&&b[3]===0)||(b[0]===0x4d&&b[1]===0x4d&&b[2]===0&&b[3]===0x2a)),
   '.tiff':()=>b.length>=4&&((b[0]===0x49&&b[1]===0x49&&b[2]===0x2a&&b[3]===0)||(b[0]===0x4d&&b[1]===0x4d&&b[2]===0&&b[3]===0x2a)),
   '.doc':()=>b.length>=8&&b.subarray(0,8).equals(Buffer.from([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1])),
   '.docx':()=>b.length>=4&&b[0]===0x50&&b[1]===0x4b&&[0x03,0x05,0x07].includes(b[2])&&[0x04,0x06,0x08].includes(b[3]),
   '.txt':()=>!b.subarray(0,Math.min(b.length,16)).some(byte=>byte===0)
  };
  if(!signatures[ext]||!signatures[ext]()){await fsp.unlink(req.file.path).catch(()=>{});return res.status(415).json({error:'File content does not match its extension. Upload a valid document or image.'});}
  return next();
 }catch(error){if(req.file?.path)await fsp.unlink(req.file.path).catch(()=>{});return next(error);}
}
router.use(requireAuth);
router.get('/',controller.list);router.post('/',upload.single('document'),validateFileSignature,controller.upload);
router.get('/:id/download',controller.download);router.get('/:id/text',controller.text);router.post('/:id/ocr',controller.ocr);router.patch('/:id',controller.rename);router.delete('/:id',controller.remove);
module.exports=router;
