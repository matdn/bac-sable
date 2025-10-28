uniform sampler2D tDiffuse;
uniform vec2 resolution;
varying vec2 vUv;

// Simplified 4x4 Bayer dithering pattern
float getDitherValue(vec2 screenPos) {
    // Use floor to ensure consistent pixel boundaries
    ivec2 coord = ivec2(floor(screenPos));
    int x = coord.x & 3; // More stable than mod for integers
    int y = coord.y & 3;
    
    // Bayer matrix as a lookup array - more reliable than matrix access
    float bayerMatrix[16] = float[16](
        0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
        12.0/16.0, 4.0/16.0, 14.0/16.0,  6.0/16.0,
        3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
        15.0/16.0, 7.0/16.0, 13.0/16.0,  5.0/16.0
    );
    
    return bayerMatrix[y * 4 + x];
}

void main() {
    vec4 texel = texture2D(tDiffuse, vUv);
    
    // Convert to luminance (grayscale) with slight gamma correction
    float gray = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
    gray = pow(gray, 0.9); // Slight gamma correction to prevent harsh transitions
    
    // Use actual fragment coordinates for more consistent dithering
    vec2 screenPos = gl_FragCoord.xy;
    float ditherValue = getDitherValue(screenPos);
    
    // Improved 3-level dithering with smoother transitions
    float dithered;
    
    // Normalize gray to 0-1 range and apply dithering
    if (gray < 0.33) {
        // Dark range: dither between black (0.0) and gray (0.5)
        float localGray = gray / 0.33; // Normalize to 0-1 within this range
        dithered = (localGray > ditherValue) ? 0.5 : 0.0;
    } else if (gray < 0.67) {
        // Mid range: dither between gray (0.5) and white (1.0)
        float localGray = (gray - 0.33) / 0.34; // Normalize to 0-1 within this range
        dithered = (localGray > ditherValue) ? 1.0 : 0.5;
    } else {
        // Light range: mostly white, some dithering with gray
        float localGray = (gray - 0.67) / 0.33; // Normalize to 0-1 within this range
        dithered = (localGray > ditherValue * 0.5) ? 1.0 : 0.5; // Less aggressive dithering in light areas
    }
    
    gl_FragColor = vec4(vec3(dithered), 1.0);
}