import { PPTXLoader } from "@langchain/community/document_loaders/fs/pptx";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx"
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import fs from "fs"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 100,      // 每个块的最大字符数
    chunkOverlap: 20,    // 块与块之间的重叠字符数，保持上下文连贯
    separators: ["\n\n", "\n", " ", ""], // 自定义分隔符优先级
});
// 加载 PPTX 文件
const pptloader = new PPTXLoader("./file/pptfile.pptx");
const pptcontent = await pptloader.load();
//直接丢不用自己提取文本，我们之前用的是splitText，需要自己提取文本给他
const pptsplitResult = await textSplitter.splitDocuments(pptcontent)
fs.writeFileSync("./pptresultSplit.json", JSON.stringify(pptsplitResult))

//加载pdf
const pdfloader = new PDFLoader("./file/pdffile.pdf");
const pdfcontent = await pdfloader.load();
const pdfsplitResult = await textSplitter.splitDocuments(pdfcontent)
fs.writeFileSync("./pdfresultSplit.json", JSON.stringify(pdfsplitResult))

//加载word
const wordloader = new DocxLoader("./file/wordfile.docx");
const wordcontent = await wordloader.load();
const wordsplitResult = await textSplitter.splitDocuments(wordcontent)
fs.writeFileSync("./wordresultSplit.json", JSON.stringify(wordsplitResult))

const compactArr = [...pptsplitResult, ...pdfsplitResult, ...wordsplitResult]
