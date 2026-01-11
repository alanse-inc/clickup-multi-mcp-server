#!/bin/bash

# Generate SSL certificates for ClickUp MCP Server HTTPS support
# This script creates self-signed certificates for development use only

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="$SCRIPT_DIR/../ssl"
DAYS=365

echo "🔒 Generating SSL certificates for ClickUp MCP Server..."

# Create ssl directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Generate private key
echo "📝 Generating private key..."
openssl genrsa -out "$CERT_DIR/server.key" 2048

# Generate certificate signing request
echo "📝 Generating certificate signing request..."
openssl req -new -key "$CERT_DIR/server.key" -out "$CERT_DIR/server.csr" -subj "/C=US/ST=Development/L=Local/O=ClickUp MCP Server/OU=Development/CN=localhost/emailAddress=dev@localhost"

# Generate self-signed certificate
echo "📝 Generating self-signed certificate..."
openssl x509 -req -in "$CERT_DIR/server.csr" -signkey "$CERT_DIR/server.key" -out "$CERT_DIR/server.crt" -days $DAYS -extensions v3_req -extfile <(
cat <<EOF
[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = 127.0.0.1
IP.1 = 127.0.0.1
EOF
)

# Set appropriate permissions
chmod 600 "$CERT_DIR/server.key"
chmod 644 "$CERT_DIR/server.crt"

# Clean up CSR file
rm "$CERT_DIR/server.csr"

echo "✅ SSL certificates generated successfully!"
echo ""
echo "📁 Certificate files created:"
echo "   Private Key: $CERT_DIR/server.key"
echo "   Certificate: $CERT_DIR/server.crt"
echo ""
echo "🔒 SECURITY NOTICE:"
echo "   These certificates are machine-specific and should NOT be committed to git."
echo "   The ssl/ directory is already in .gitignore to prevent accidental commits."
echo ""
echo "🚀 To use HTTPS with your ClickUp MCP Server:"
echo ""
echo "   export ENABLE_HTTPS=true"
echo "   export SSL_KEY_PATH=$CERT_DIR/server.key"
echo "   export SSL_CERT_PATH=$CERT_DIR/server.crt"
echo ""
echo "   Then start your server normally:"
echo "   CLICKUP_API_KEY=your-key CLICKUP_TEAM_ID=your-team ENABLE_SSE=true npx @alanse/clickup-multi-mcp-server@latest"
echo ""
echo "⚠️  Note: These are self-signed certificates for development only."
echo "   Browsers will show security warnings that you'll need to accept."
echo "   For production, use certificates from a trusted Certificate Authority."
echo ""
echo "🔗 Your HTTPS endpoints will be:"
echo "   • https://127.0.0.1:3443/mcp (Streamable HTTPS)"
echo "   • https://127.0.0.1:3443/sse (Legacy SSE HTTPS)"
echo "   • https://127.0.0.1:3443/health (Health check HTTPS)"
