// Wrapper for globe.gl to handle ES module import correctly
let GlobeGL;

try {
  // Try dynamic import
  GlobeGL = await import('globe.gl');
  GlobeGL = GlobeGL.default || GlobeGL;
} catch (err) {
  console.error('Failed to import globe.gl:', err);
}

export default GlobeGL;
