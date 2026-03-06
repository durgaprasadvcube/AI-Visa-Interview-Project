declare module 'pdf-parse' {
    interface PdfParseData {
        numpages: number;
        numrender: number;
        info: any;
        metadata: any;
        text: string;
        version: string;
    }

    function pdfParse(dataBuffer: Buffer, options?: any): Promise<PdfParseData>;
    export default pdfParse;
}
