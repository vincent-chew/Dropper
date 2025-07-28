document.addEventListener('DOMContentLoaded', () => {
  // 获取DOM元素
  const uploadInput = document.getElementById('imageUpload');
  const dropZone = document.getElementById('dropZone');
  const preview = document.getElementById('imagePreview');
  const defaultPreview = document.getElementById('defaultPreview');
  const loader = document.getElementById('loader');
  const notification = document.getElementById('notification');
  const previewSection = document.getElementById('previewSection');
  
  // 获取三个颜色区域的容器
  const dominantColorsContainer = document.getElementById('dominantColors');
  const topColorsContainer = document.getElementById('topColors');
  const bottomColorsContainer = document.getElementById('bottomColors');
  
  // 初始化Color Thief
  const colorThief = new ColorThief();
  
  // 文件选择处理
  uploadInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      handleImage(e.target.files[0]);
    }
  });

  // 拖放/点击上传 功能
  dropZone.addEventListener('click', () => uploadInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('active');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('active');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('active');
    
    if (e.dataTransfer.files.length) {
      handleImage(e.dataTransfer.files[0]);
    }
  });

  // 主处理函数
  function handleImage(file) {
    if (!file.type.match('image.*')) {
      alert('不支持该类型的文件');
      return;
    }

    // 显示加载动画
    loader.style.display = 'block';
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      preview.src = e.target.result;
      
      preview.onload = () => {
        // 检查图片尺寸
        if (preview.naturalHeight < 5) {
          alert('图片高度太小，无法分区提取颜色');
          loader.style.display = 'none';
          return;
        }
        
        // 隐藏缺省图，显示预览
        defaultPreview.style.display = 'none';
        preview.style.display = 'block';
        
        // 提取主色
        try {
          // 1. 提取整个图片的第一个颜色（主色）
          const dominantColors = [extractDominantColors(preview)[0]];
          
          // 2. 提取图片顶部1/5区域的第一个颜色
          const topColors = [extractRegionColors(preview, 0, 0.2)[0]];
          
          // 3. 提取图片底部1/5区域的第一个颜色
          const bottomColors = [extractRegionColors(preview, 0.8, 1)[0]];
          
          // 显示三个区域的颜色
          displayPalette(dominantColors, dominantColorsContainer, 'Primary');
          displayPalette(topColors, topColorsContainer, 'Header');
          displayPalette(bottomColors, bottomColorsContainer, 'Footer');
          
        } catch (error) {
          alert('颜色提取失败: ' + error.message);
        } finally {
          // 隐藏加载动画
          loader.style.display = 'none';
          // 显示预览区域
          previewSection.classList.remove('hidden');
        }
      };
    };
    
    reader.readAsDataURL(file);
  }

  // 安全提取主色调
  function extractDominantColors(img) {
    try {
      // 尝试使用ColorThief提取颜色
      const colors = colorThief.getPalette(img, 3) || [];
      
      // 如果成功提取到颜色，返回结果
      if (colors.length > 0) return colors;
      
      // 如果提取失败，获取图片左上角像素颜色作为单一颜色
      return getSingleColorFallback(img);
    } catch (error) {
      // 出错时使用备选方案
      return getSingleColorFallback(img);
    }
  }

  // 安全提取区域颜色
  function extractRegionColors(img, startYPercent, endYPercent) {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // 设置canvas尺寸
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      // 计算裁剪区域
      const startY = Math.floor(img.naturalHeight * startYPercent);
      const height = Math.floor(img.naturalHeight * (endYPercent - startYPercent));
      
      // 确保高度至少为1像素
      const validHeight = Math.max(height, 1);
      
      // 绘制指定区域到canvas
      ctx.drawImage(
        img, 
        0, startY, 
        img.naturalWidth, validHeight,
        0, 0, 
        img.naturalWidth, validHeight
      );
      
      // 尝试提取颜色
      const colors = colorThief.getPalette(canvas, 3) || [];
      
      // 如果提取成功，返回颜色数组
      if (colors.length > 0) return colors;
      
      // 如果提取失败，获取区域左上角像素颜色
      const pixelData = ctx.getImageData(0, 0, 1, 1).data;
      const color = [pixelData[0], pixelData[1], pixelData[2]];
      
      // 返回三个相同的颜色（为了保持UI一致性）
      return [color, color, color];
    } catch (error) {
      // 出错时使用备选方案
      return getSingleColorFallback(img);
    }
  }

  // 获取单一颜色作为备选方案
  function getSingleColorFallback(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 创建1x1像素的canvas
    canvas.width = 1;
    canvas.height = 1;
    
    // 绘制图片的左上角像素
    ctx.drawImage(img, 0, 0, 1, 1);
    
    // 获取像素颜色数据
    const pixelData = ctx.getImageData(0, 0, 1, 1).data;
    const color = [pixelData[0], pixelData[1], pixelData[2]];
    
    // 返回三个相同的颜色（为了保持UI一致性）
    return [color, color, color];
  }

  // RGB转HSL
  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // 灰色
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      
      h = (h * 60) % 360;
      if (h < 0) h += 360;
    }

    return [
      Math.round(h),
      Math.round(s * 100),
      Math.round(l * 100)
    ];
  }

  // HSL转RGB
  function hslToRgb(h, s, l) {
    h = h % 360;
    s = s / 100;
    l = l / 100;
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l; // 灰色
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r = hue2rgb(p, q, h/360 + 1/3);
      g = hue2rgb(p, q, h/360);
      b = hue2rgb(p, q, h/360 - 1/3);
    }
    
    return [
      Math.round(r * 255),
      Math.round(g * 255),
      Math.round(b * 255)
    ];
  }

  // 计算与白色的对比度
  function getContrastRatio(r, g, b) {
    // 计算相对亮度 (WCAG 2.1公式)
    const rSRGB = r / 255;
    const gSRGB = g / 255;
    const bSRGB = b / 255;
    
    const rLinear = rSRGB <= 0.03928 ? rSRGB / 12.92 : Math.pow((rSRGB + 0.055) / 1.055, 2.4);
    const gLinear = gSRGB <= 0.03928 ? gSRGB / 12.92 : Math.pow((gSRGB + 0.055) / 1.055, 2.4);
    const bLinear = bSRGB <= 0.03928 ? bSRGB / 12.92 : Math.pow((bSRGB + 0.055) / 1.055, 2.4);
    
    const L = 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
    
    // 白色背景的亮度为1
    return (1 + 0.05) / (L + 0.05);
  }

  // 调整对比度至3:1以上
  function adjustContrast(r, g, b) {
    let contrast = getContrastRatio(r, g, b);
    
    // 如果对比度已经足够，直接返回
    if (contrast >= 3) return [r, g, b];
    
    // 转换为HSL调整亮度
    let [h, s, l] = rgbToHsl(r, g, b);
    
    // 逐步降低亮度直到对比度达标
    while (contrast < 3 && l > 5) {
      l = Math.max(l - 5, 5);
      const rgb = hslToRgb(h, s, l);
      contrast = getContrastRatio(...rgb);
    }
    
    return hslToRgb(h, s, l);
  }

  // 修改亮度和饱和度调整算法
  function adjustLightnessSaturation(r, g, b) {
    let [h, s, l] = rgbToHsl(r, g, b);
    
    // 检查是否为白色或灰度色
    const isWhite = r === 255 && g === 255 && b === 255;
    const isGrayscale = s === 0; // 饱和度为0
    
    if (isWhite || isGrayscale) {
      // 使用乘法公式调整
      // 调整亮度: B2 = 0.8 * B1
      l = 0.8 * l;
      // 限制在0-80之间
      l = Math.min(Math.max(l, 0), 80);
      
      // 调整饱和度: S2 = 0.9 * S1
      s = 0.9 * s;
      // 限制在0-90之间
      s = Math.min(Math.max(s, 0), 90);
    } else {
      // 使用加法公式调整
      // 调整亮度: B2 = 20 + 0.6 * B1
      l = 20 + 0.6 * l;
      // 限制在20-80之间
      l = Math.min(Math.max(l, 20), 80);
      
      // 调整饱和度: S2 = 30 + 0.6 * S1
      s = 30 + 0.6 * s;
      // 限制在30-90之间
      s = Math.min(Math.max(s, 30), 90);
    }
    
    return hslToRgb(h, s, l);
  }

  // 修改深色调整算法
  function adjustDark(r, g, b) {
    let [h, s, l] = rgbToHsl(r, g, b);
    
    // H值+10
    h = (h + 10) % 360;
    
    // S值*0.9
    s = s * 0.9;
    
    // B值-15 (如果结果小于0则取0)
    l = Math.max(l - 15, 0);
    
    return hslToRgb(h, s, l);
  }

  // 创建隐藏的复制用 textarea
  const copyTextarea = document.createElement('textarea');
  copyTextarea.setAttribute('id', 'copyTextarea');
  copyTextarea.style.position = 'fixed';
  copyTextarea.style.top = '-1000px';
  copyTextarea.style.left = '-1000px';
  copyTextarea.style.opacity = '0';
  document.body.appendChild(copyTextarea);

  // 显示颜色结果
  function displayPalette(colors, container, sectionName) {
    container.innerHTML = '';
    
    // 检查颜色数组是否有效
    if (!Array.isArray(colors) || colors.length === 0) {
      const errorMsg = document.createElement('p');
      errorMsg.className = 'color-error';
      errorMsg.textContent = '无法提取该区域颜色';
      container.appendChild(errorMsg);
      return;
    }
    
    // 只取第一个颜色
    const originalColor = colors[0];
    const [r, g, b] = originalColor;
    const originalHex = rgbToHex(r, g, b);
    
    // 获取原始颜色的HSL值（用于后续判断）
    const [h_orig, s_orig, l_orig] = rgbToHsl(r, g, b);
    
    // 调整对比度
    const contrastAdjusted = adjustContrast(r, g, b);
    const contrastHex = rgbToHex(...contrastAdjusted);
    
    // 调整亮度和饱和度
    let adjustedRGB = adjustLightnessSaturation(...contrastAdjusted);
    
    // 新增规则：如果原始颜色的亮度大于59，恢复原始饱和度
    if (l_orig > 59) {
      // 获取当前调整后的HSL值
      const [h_adj, s_adj, l_adj] = rgbToHsl(...adjustedRGB);
      
      // 使用原始饱和度值
      adjustedRGB = hslToRgb(h_adj, s_orig, l_adj);
    }
    
    const adjustedHex = rgbToHex(...adjustedRGB);
    
    // 深色调整
    const darkAdjusted = adjustDark(...adjustedRGB);
    const darkHex = rgbToHex(...darkAdjusted);
    
    // 创建三个颜色块
    createColorBox(container, originalHex, '取色结果');
    createColorBox(container, adjustedHex, '调整后');
    createColorBox(container, darkHex, '深色部分');
  }

  // 创建颜色块
  function createColorBox(container, hex, label) {
    const colorBox = document.createElement('div');
    colorBox.className = 'color-box';
    colorBox.style.backgroundColor = hex;
    colorBox.innerHTML = `
      <span>${hex}</span>
      <div class="color-label">${label}</div>
    `;
    colorBox.dataset.color = hex;
    
    // 添加点击复制功能 - 使用更健壮的方法
    colorBox.addEventListener('click', () => {
      copyToClipboard(hex);
    });
    
    container.appendChild(colorBox);
  }

  // 更健壮的复制到剪贴板函数
  async function copyToClipboard(text) {
    try {
      // 尝试使用现代 Clipboard API
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showNotification(`已复制颜色代码: ${text}`);
        return;
      }
      
      // 使用备用方法
      const textarea = document.getElementById('copyTextarea');
      textarea.value = text;
      textarea.select();
      
      // 尝试执行复制命令
      const result = document.execCommand('copy');
      
      if (result) {
        showNotification(`已复制颜色代码: ${text}`);
      } else {
        showNotification('复制失败，请手动复制颜色代码', true);
      }
    } catch (err) {
      console.error('复制失败:', err);
      
      // 显示详细的错误信息
      let errorMsg = '复制失败';
      
      if (err.name === 'NotAllowedError') {
        errorMsg = '复制被拒绝，请授予剪贴板权限';
      } else if (err.name === 'SecurityError') {
        errorMsg = '安全限制阻止了复制操作';
      } else if (err.name === 'TypeError') {
        errorMsg = '浏览器不支持剪贴板功能';
      }
      
      showNotification(`${errorMsg}: ${text}`, true);
    }
  }

  // RGB转HEX
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }
  
  // 修改显示通知函数，支持错误样式
  function showNotification(message, isError = false) {
    notification.textContent = message || '颜色代码已复制到剪贴板！';
    
    // 设置通知样式
    if (isError) {
      notification.style.background = '#E5404E';
    } else {
      notification.style.background = '#0022CC';
    }
    
    notification.classList.add('show');
    
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }

});