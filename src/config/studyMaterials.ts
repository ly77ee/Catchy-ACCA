import { StudyMaterial } from '../types';

export const MAX_PDF_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB per PDF document

export type MaterialTypeOption = 'Exam Kit' | 'Study Text' | 'Revision Material' | 'Technical Article' | 'Other';

export const MATERIAL_TYPE_OPTIONS: MaterialTypeOption[] = [
  'Exam Kit',
  'Study Text',
  'Revision Material',
  'Technical Article',
  'Other'
];

/**
 * Returns formatted label for material including material sequence number
 * Example: "Material 1 · SBR Exam Kit"
 */
export function getMaterialDisplayName(material: StudyMaterial, index: number): string {
  const numberPrefix = `Material ${index + 1}`;
  return `${numberPrefix} · ${material.title || material.fileName}`;
}

/**
 * Human-readable byte formatting
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
