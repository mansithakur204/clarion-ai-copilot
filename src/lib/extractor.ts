// Helper utilities to extract actual text from PDF, DOCX, and TXT files in the browser

export function extractRawTextFromPDFArrayBuffer(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder("latin1");
  const str = decoder.decode(buffer);

  const matches: string[] = [];
  const textObjRegex = /\(([^()\\]|\\[\s\S])*\)\s*(Tj|TJ|\')/g;
  let match;

  while ((match = textObjRegex.exec(str)) !== null) {
    const clean = match[0]
      .replace(/\s*(Tj|TJ|\')$/, "")
      .replace(/^\(/, "")
      .replace(/\)$/, "")
      .replace(/\\([()])/g, "$1")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t");

    if (clean.trim().length > 0) {
      matches.push(clean);
    }
  }

  if (matches.length > 5) {
    return matches.join(" ");
  }

  const asciiOnly = str.replace(/[^\x20-\x7E\n\r\t]/g, " ");
  const lines = asciiOnly
    .split("\n")
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 3 &&
        !l.startsWith("/") &&
        !l.startsWith("<<") &&
        !l.startsWith(">>") &&
        !l.includes("endobj") &&
        !l.includes("stream")
    );

  return lines.join(" ");
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    const pdfjsLib = await import("pdfjs-dist");
    if (typeof window !== "undefined" && pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version || "3.11.174"}/build/pdf.worker.min.mjs`;
    }

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n\n";
    }

    if (fullText.trim().length > 10) {
      return fullText.trim();
    }
  } catch (pdfJsErr) {
    console.warn("pdfjs-dist warning, falling back to arrayBuffer stream parsing:", pdfJsErr);
  }

  const fallbackText = extractRawTextFromPDFArrayBuffer(arrayBuffer);
  if (fallbackText && fallbackText.trim().length > 10) {
    return fallbackText.trim();
  }

  throw new Error("Failed to extract readable text from PDF.");
}

export async function extractTextFromDOCX(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  if (result.value && result.value.trim().length > 0) {
    return result.value.trim();
  }
  throw new Error("Could not extract text from DOCX file.");
}

export function extractTextFromTXT(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || "";
      if (text.trim().length > 0) {
        resolve(text.trim());
      } else {
        reject(new Error("TXT file is empty."));
      }
    };
    reader.onerror = () => {
      reject(new Error("Failed to read text file."));
    };
    reader.readAsText(file);
  });
}

export async function extractDocumentText(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".txt")) {
    return await extractTextFromTXT(file);
  }

  if (name.endsWith(".docx")) {
    return await extractTextFromDOCX(file);
  }

  if (name.endsWith(".pdf")) {
    return await extractTextFromPDF(file);
  }

  throw new Error("Unsupported file type.");
}
