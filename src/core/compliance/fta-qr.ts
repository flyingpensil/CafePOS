// ============================================================================
// UAE FTA COMPLIANT DYNAMIC TLV QR CODE GENERATOR
// Standard: Tag-Length-Value (TLV) Base64 encoding according to UAE FTA & GCC
// E-Invoicing Simplified Tax Invoice requirements.
// ============================================================================

export interface FtaQrData {
  sellerName: string;    // Tag 1: Legal business or branch name (UTF-8)
  trn: string;           // Tag 2: 15-digit Tax Registration Number
  timestamp: string;     // Tag 3: ISO 8601 timestamp (e.g. 2026-10-29T14:54:10Z)
  invoiceTotal: number;  // Tag 4: Grand total in AED including VAT (e.g. 25.50)
  vatTotal: number;      // Tag 5: Total 5% VAT in AED (e.g. 1.21)
}

declare const Buffer: any;

export class FtaQrEngine {
  /**
   * Encodes an individual TLV entry: [Tag: 1 byte, Length: 1 byte, Value: N bytes]
   */
  private static encodeTlvTag(tagNumber: number, valueStr: string): Uint8Array {
    const encoder = new TextEncoder();
    const valueBytes = encoder.encode(valueStr);
    const length = valueBytes.length;

    // Allocate 2 header bytes (Tag + Length) + value bytes
    const tlv = new Uint8Array(2 + length);
    tlv[0] = tagNumber;
    tlv[1] = length;
    tlv.set(valueBytes, 2);

    return tlv;
  }

  /**
   * Generates the compliant UAE FTA TLV byte stream and returns it as a Base64 string.
   */
  public static generateTlvBase64(data: FtaQrData): string {
    const formattedTotal = data.invoiceTotal.toFixed(2);
    const formattedVat = data.vatTotal.toFixed(2);

    // Tag 1: Seller's Name
    const tag1 = this.encodeTlvTag(1, data.sellerName);
    // Tag 2: Seller's 15-digit TRN
    const tag2 = this.encodeTlvTag(2, data.trn.trim());
    // Tag 3: Timestamp (ISO 8601)
    const tag3 = this.encodeTlvTag(3, data.timestamp);
    // Tag 4: Invoice Total (with VAT)
    const tag4 = this.encodeTlvTag(4, formattedTotal);
    // Tag 5: VAT Total
    const tag5 = this.encodeTlvTag(5, formattedVat);

    // Concatenate all TLV byte arrays
    const totalLength = tag1.length + tag2.length + tag3.length + tag4.length + tag5.length;
    const combined = new Uint8Array(totalLength);

    let offset = 0;
    for (const tagBytes of [tag1, tag2, tag3, tag4, tag5]) {
      combined.set(tagBytes, offset);
      offset += tagBytes.length;
    }

    // Convert Uint8Array to Base64 (environment-agnostic)
    return this.uint8ArrayToBase64(combined);
  }

  /**
   * Decodes a TLV Base64 string back into structured FTA verification fields.
   * Useful for receipt verification and audit logs.
   */
  public static decodeTlvBase64(base64Str: string): Partial<FtaQrData> {
    const bytes = this.base64ToUint8Array(base64Str);
    const decoder = new TextDecoder('utf-8');
    const result: Partial<FtaQrData> = {};

    let index = 0;
    while (index < bytes.length) {
      const tag = bytes[index];
      const length = bytes[index + 1];
      const valueBytes = bytes.slice(index + 2, index + 2 + length);
      const valueStr = decoder.decode(valueBytes);

      switch (tag) {
        case 1:
          result.sellerName = valueStr;
          break;
        case 2:
          result.trn = valueStr;
          break;
        case 3:
          result.timestamp = valueStr;
          break;
        case 4:
          result.invoiceTotal = parseFloat(valueStr);
          break;
        case 5:
          result.vatTotal = parseFloat(valueStr);
          break;
      }

      index += 2 + length;
    }

    return result;
  }

  /**
   * Cross-platform Uint8Array to Base64 converter.
   */
  private static uint8ArrayToBase64(bytes: Uint8Array): string {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(bytes).toString('base64');
    }
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Cross-platform Base64 to Uint8Array converter.
   */
  private static base64ToUint8Array(base64: string): Uint8Array {
    if (typeof Buffer !== 'undefined') {
      return new Uint8Array(Buffer.from(base64, 'base64'));
    }
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
