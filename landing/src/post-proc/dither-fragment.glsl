uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float pointSize;
varying vec2 vUv;

// Simplified 4x4 Bayer dithering pattern
float getDitherValue(vec2 screenPos) {
    // Scale the screen position by pointSize to make larger dither points
    vec2 scaledPos = screenPos / pointSize;
    
    // Use floor to ensure consistent pixel boundaries
    ivec2 coord = ivec2(floor(scaledPos));
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
    
    // Inverted 3-level dithering for white background
    // Levels: 1.0 (white), 0.5 (gray), 0.0 (black) - inverted from original
    float dithered;
    
    // Normalize gray to 0-1 range and apply inverted dithering
    if (gray < 0.33) {
        // Dark range: dither between black (0.0) and gray (0.5)
        float localGray = gray / 0.33;
        dithered = (localGray > ditherValue) ? 0.5 : 0.0;
    } else if (gray < 0.67) {
        // Mid range: dither between gray (0.5) and white (1.0)
        float localGray = (gray - 0.33) / 0.34;
        dithered = (localGray > ditherValue) ? 1.0 : 0.5;
    } else {
        // Light range: mostly white, some dithering with gray
        float localGray = (gray - 0.67) / 0.33;
        dithered = (localGray > ditherValue * 0.3) ? 1.0 : 0.5; // More white on white background
    }
    
    gl_FragColor = vec4(vec3(dithered), 1.0);
}