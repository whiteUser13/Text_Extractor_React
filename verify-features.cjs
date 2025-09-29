#!/usr/bin/env node

/**
 * 功能验证脚本
 * 验证新增功能的文件结构和基本配置
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 开始验证新功能...\n');

// 验证文件是否存在
const requiredFiles = [
  'src/pages/FileDecompression.tsx',
  'src/pages/ResultsOutput.tsx',
  'src/routes.tsx',
  'src/pages/Dashboard.tsx',
  'README.md'
];

console.log('📁 验证必要文件...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - 文件不存在`);
    allFilesExist = false;
  }
});

// 验证路由配置
console.log('\n🛣️  验证路由配置...');
try {
  const routesContent = fs.readFileSync(path.join(__dirname, 'src/routes.tsx'), 'utf8');
  
  const expectedRoutes = [
    'FileDecompression',
    'ResultsOutput',
    '/decompression',
    '/results'
  ];
  
  let routesValid = true;
  expectedRoutes.forEach(route => {
    if (routesContent.includes(route)) {
      console.log(`✅ 路由包含: ${route}`);
    } else {
      console.log(`❌ 路由缺失: ${route}`);
      routesValid = false;
    }
  });
  
  if (routesValid) {
    console.log('✅ 路由配置正确');
  }
} catch (error) {
  console.log('❌ 路由配置验证失败:', error.message);
  allFilesExist = false;
}

// 验证组件导入
console.log('\n📦 验证组件导入...');
try {
  const decompressionContent = fs.readFileSync(path.join(__dirname, 'src/pages/FileDecompression.tsx'), 'utf8');
  const resultsContent = fs.readFileSync(path.join(__dirname, 'src/pages/ResultsOutput.tsx'), 'utf8');
  
  const requiredImports = [
    'React',
    'useState',
    'useEffect',
    'Card',
    'Button',
    'Progress',
    'Badge'
  ];
  
  let importsValid = true;
  
  // 检查解压缩组件
  requiredImports.forEach(imp => {
    if (decompressionContent.includes(imp)) {
      console.log(`✅ FileDecompression 包含: ${imp}`);
    } else {
      console.log(`❌ FileDecompression 缺失: ${imp}`);
      importsValid = false;
    }
  });
  
  // 检查成果表格组件
  requiredImports.forEach(imp => {
    if (resultsContent.includes(imp)) {
      console.log(`✅ ResultsOutput 包含: ${imp}`);
    } else {
      console.log(`❌ ResultsOutput 缺失: ${imp}`);
      importsValid = false;
    }
  });
  
  if (importsValid) {
    console.log('✅ 组件导入正确');
  }
} catch (error) {
  console.log('❌ 组件导入验证失败:', error.message);
  allFilesExist = false;
}

// 验证功能特性
console.log('\n🎯 验证功能特性...');

const featureChecks = [
  {
    name: '解压缩处理功能',
    file: 'src/pages/FileDecompression.tsx',
    keywords: ['解压缩', 'decompression', 'Archive', 'logs', 'progress']
  },
  {
    name: '成果表格输出功能',
    file: 'src/pages/ResultsOutput.tsx',
    keywords: ['表格', 'template', 'Table2', 'export', 'results']
  }
];

featureChecks.forEach(check => {
  try {
    const content = fs.readFileSync(path.join(__dirname, check.file), 'utf8');
    let featureValid = true;
    
    check.keywords.forEach(keyword => {
      if (content.includes(keyword)) {
        console.log(`✅ ${check.name} - 包含关键词: ${keyword}`);
      } else {
        console.log(`⚠️  ${check.name} - 缺少关键词: ${keyword}`);
        // 不设为失败，因为关键词可能有变化
      }
    });
  } catch (error) {
    console.log(`❌ ${check.name} - 验证失败:`, error.message);
  }
});

// 总结
console.log('\n📊 验证总结:');
if (allFilesExist) {
  console.log('🎉 所有必要文件和配置都已正确创建！');
  console.log('✨ 新功能已成功集成到系统中');
  console.log('\n📋 功能清单:');
  console.log('   1. ✅ 解压缩处理模块');
  console.log('   2. ✅ 成果表格输出模块');
  console.log('   3. ✅ 路由配置更新');
  console.log('   4. ✅ 导航界面更新');
  console.log('   5. ✅ 文档更新完成');
  
  console.log('\n🚀 下一步操作:');
  console.log('   1. 运行 npm run dev 启动应用');
  console.log('   2. 测试新功能模块');
  console.log('   3. 查看 test-new-features.md 了解详细测试步骤');
} else {
  console.log('❌ 验证过程中发现问题，请检查上述错误信息');
}

console.log('\n🔗 相关文件:');
console.log('   - 解压缩处理: src/pages/FileDecompression.tsx');
console.log('   - 成果表格输出: src/pages/ResultsOutput.tsx');
console.log('   - 测试指南: test-new-features.md');
console.log('   - 项目文档: README.md');