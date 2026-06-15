import { PPTXLoader } from "@langchain/community/document_loaders/fs/pptx";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx"
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import fs from "fs"


// 加载 PPTX 文件
const pptloader = new PPTXLoader("./file/pptfile.pptx");
const pptcontent = await pptloader.load();
fs.writeFileSync("./pptresult.json", JSON.stringify(pptcontent))
//加载pdf
const pdfloader = new PDFLoader("./file/pdffile.pdf");
const pdfcontent = await pdfloader.load();
fs.writeFileSync("./pdfresult.json", JSON.stringify(pdfcontent))
//加载word
const wordloader = new DocxLoader("./file/wordfile.docx");
const wordcontent = await wordloader.load();
fs.writeFileSync("./wordresult.json", JSON.stringify(wordcontent))


