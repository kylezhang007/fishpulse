#!/bin/zsh
# 双击运行：构建 FishPulse Demo 并在浏览器中打开。关闭这个终端窗口即停止。
cd "$(dirname "$0")"
export PATH="$HOME/.local/node/bin:$PATH"

if ! command -v node >/dev/null 2>&1; then
  echo "找不到 Node.js，请先安装：https://nodejs.org"; read -k1; exit 1
fi
[ -d node_modules ] || { echo "首次运行，正在安装依赖…"; npm install || { read -k1; exit 1; }; }

echo "正在构建网页…"
npm run build >/dev/null || { echo "构建失败"; npm run build; read -k1; exit 1; }

echo ""
echo "🎣 FishPulse Demo 已启动：http://localhost:4173"
echo "   （同一 Wi-Fi 下的手机可以用下面显示的 Network 地址打开）"
echo "   关闭此窗口即可停止。"
echo ""
npx vite preview --port 4173 --host --open
