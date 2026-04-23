# 点到点光纤通信系统 (1 Gb/s 100 km) 实施计划

> **For agentic workers:** 按照以下步骤在OptiSystem 15中逐步搭建系统，每一步完成后验证结果再进行下一步。

**Goal:** 在OptiSystem 15中搭建并仿真一个1 Gb/s 100 km NRZ调制相干检测的点到点光纤通信系统。

**Architecture:** 直接调制DFB激光器 + EDFA功率放大 + 100 km G.652单模光纤 + 相干检测接收。系统单跨传输，无中继。使用BER分析仪验证系统性能。

**Tech Stack:** OptiSystem 15.0，元件库使用：
- 光源库: DFB激光器
- 调制编码: NRZ脉冲发生器
- 光纤链路: 单模光纤 (SMF)
- 光放大: EDFA
- 接收: 90°混频器 + 平衡探测器 + 相干DSP
- 测试仪器: 光谱分析仪、眼图分析仪、BER分析仪

---

### Task 1: 打开OptiSystem并创建新项目

**操作:**
- [ ] **Step 1: 启动OptiSystem**

运行 `D:\DownLoad\OptiSystem 15\bin\OptiSystemx64.exe`

- [ ] **Step 2: 创建新项目**

File → New → Project

- [ ] **Step 3: 设置工作区**

确认默认设置，保存项目为:
`point-to-point-1Gb-100km.osd`

### Task 2: 添加并配置伪随机码发生器

**元件库路径:**
- Sources → Bit Sequence Generators → PRBS Generator

**参数设置:**
- [ ] **Step 1: 添加PRBS发生器到工作区**

- [ ] **Step 2: 配置参数**

双击打开参数设置:
- Bit rate: `1e9` (1 Gb/s)
- Pattern length: `2^31 - 1`
- Number of bit: `2^15` (32768 bits for simulation)
- Voltage: `High = 1.0 V, Low = 0.0 V`

### Task 3: 添加并配置NRZ编码器

**元件库路径:**
- Pulse Generators → NRZ Pulse Generator

**参数设置:**
- [ ] **Step 1: 添加NRZ脉冲发生器**

- [ ] **Step 2: 配置参数**

双击打开参数设置:
- Bit rate: `1 Gb/s`
- Extinction ratio: `20 dB`

- [ ] **Step 3: 连接信号**

连接 PRBS Generator 输出 → NRZ Pulse Generator 输入

### Task 4: 添加并配置DFB激光器（发射端）

**元件库路径:**
- Lasers/LEDs → DFB Laser

**参数设置:**
- [ ] **Step 1: 添加DFB激光器**

- [ ] **Step 2: 配置参数**

双击打开参数设置:
- Frequency: `193.1 THz` (对应1550 nm波长)
- Power: `0 dBm` (1 mW)
- Linewidth: `10 MHz`
- Relative intensity noise: `-155 dB/Hz`
- Temperature: `25 C`

- [ ] **Step 3: 连接**

连接 NRZ Pulse Generator 输出 → DFB Laser 调制输入

### Task 5: 添加并配置EDFA功率放大器

**元件库路径:**
- Optical Amplifiers → EDFA

**参数设置:**
- [ ] **Step 1: 添加EDFA**

- [ ] **Step 2: 配置参数**

双击打开参数设置:
- Gain model: `Fixed gain`
- Gain: `15 dB`
- Output power: `15 dBm`
- Noise figure: `5.0 dB`
- Noise bandwidth: `2.5 THz`

- [ ] **Step 3: 连接**

连接 DFB Laser 光输出 → EDFA 输入

### Task 6: 添加并配置100 km G.652光纤

**元件库路径:**
- Fibers → Single Mode Fiber (SMF)

**参数设置:**
- [ ] **Step 1: 添加单模光纤**

- [ ] **Step 2: 配置参数 (G.652规格)**

双击打开参数设置:
- Length: `100 km`
- Attenuation: `0.20 dB/km @ 1550 nm`
- Dispersion: `17 ps/(nm·km) @ 1550 nm`
- Dispersion slope: `0.075 ps/(nm²·km) @ 1550 nm`
- Effective area: `80 µm²`
- Nonlinear refractive index: `2.6e-20 m²/W`

- [ ] **Step 3: 连接**

连接 EDFA 输出 → SMF 光纤输入

### Task 7: 添加并配置本振激光器

**元件库路径:**
- Lasers/LEDs → DFB Laser

**参数设置:**
- [ ] **Step 1: 添加第二个DFB作为本振**

- [ ] **Step 2: 配置参数**

双击打开参数设置:
- Frequency: `193.1 THz` (与发射端相同波长)
- Power: `10 dBm`
- Linewidth: `10 MHz`

### Task 8: 添加并配置90°光混频器

**元件库路径:**
- Integrated Optics → Hybrid 90 degrees (coherent detection)

**参数设置:**
- [ ] **Step 1: 添加90°光混频器**

- [ ] **Step 2: 连接信号**

- 光纤SMF输出 → Hybrid 90 degrees 信号输入 (Signal)
- LO DFB输出 → Hybrid 90 degrees 本振输入 (Local Oscillator)

### Task 9: 添加并配置平衡光电探测器

**元件库路径:**
- Photodetectors → Balanced PIN Photodetector

**需要两个，分别检测I路和Q路**

**参数设置 (两个探测器参数相同):**
- [ ] **Step 1: 添加第一个平衡探测器**

- [ ] **Step 2: 配置参数**

双击打开参数设置:
- Responsivity: `0.9 A/W @ 1550 nm`
- Dark current: `10 nA`
- Thermal noise density: `10 pA/√Hz`

- [ ] **Step 3: 添加第二个平衡探测器**

复制粘贴第一个，参数保持相同

- [ ] **Step 4: 连接**

- Hybrid X+ output → 第一个探测器输入1
- Hybrid X- output → 第一个探测器输入2
- Hybrid Y+ output → 第二个探测器输入1
- Hybrid Y- output → 第二个探测器输入2

### Task 10: 添加并配置相干DSP处理单元

**元件库路径:**
- Coherent Detection → Coherent Receiver DSP

**参数设置:**
- [ ] **Step 1: 添加Coherent Receiver DSP**

- [ ] **Step 2: 配置参数**

双击打开参数设置:
- Bit rate: `1 Gb/s`
- Modulation format: `ASK/NRZ`
- Clock recovery: `Enabled`
- Phase estimation: `Enabled`
- Polarization tracking: `Enabled (if available)`

- [ ] **Step 3: 连接**

- 第一个平衡探测器输出 → Coherent DSP I输入
- 第二个平衡探测器输出 → Coherent DSP Q输入

### Task 11: 添加并配置误码率分析仪

**元件库路径:**
- Visualizers/Bit Sequence Analyzers → BER Analyzer

**参数设置:**
- [ ] **Step 1: 添加BER分析仪**

- [ ] **Step 2: 连接**

- Coherent DSP 输出 → BER Analyzer 输入
- PRBS Generator 参考输出 → BER Analyzer 参考输入

### Task 12: 添加观测仪器

**添加以下观测仪器用于结果分析:**

- [ ] **Step 1: 添加光谱分析仪**

元件库: Visualizers → Optical Spectrum Analyzer
连接位置: EDFA输出端 (观测发射光谱)

- [ ] **Step 2: 添加眼图分析仪**

元件库: Visualizers → Eye Diagram Analyzer
连接位置: Coherent DSP 输出端

- [ ] **Step 3: 添加光功率计**

元件库: Measurements → Optical Power Meter
连接位置: 光纤输出端 (接收光功率测量)

### Task 13: 运行仿真并验证结果

**仿真设置:**
- [ ] **Step 1: 设置仿真时间**

Simulation → Simulation Parameters:
- End time: `3.2768e-5` seconds (32768 bits at 1 Gb/s = 32.768 µs)
- Time step: `6.4e-11` seconds (≈ 16 samples per bit)

- [ ] **Step 2: 运行仿真**

点击 "Run" 按钮开始仿真

- [ ] **Step 3: 检查接收光功率**

在光功率计读取: 预期约 -7 ~ -10 dBm ✓

- [ ] **Step 4: 查看光谱**

在光谱分析仪中观察: 中心波长1550 nm，谱宽符合预期 ✓

- [ ] **Step 5: 查看眼图**

在眼图分析仪中观察: 眼睛张开清晰，没有明显噪声 ✓

- [ ] **Step 6: 读取BER结果**

在BER分析仪中读取:
 预期: BER < 10^-9，Q因子 > 15 dB ✓

### Task 14: 保存项目并整理

- [ ] **Step 1: 保存项目**

File → Save 确认保存为 `point-to-point-1Gb-100km.osd`

- [ ] **Step 2: 记录结果**

截取仿真结果截图保存，记录:
- 接收光功率
- 最终误码率BER
- Q因子
- 眼图观测描述

---

## 完整系统连接图

```
PRBS Generator → NRZ Pulse Generator → DFB Laser → EDFA → SMF (100km)
                                                                 ↓
LO DFB → Hybrid 90° ←───────────────────────────────────────────┘
                                                                 ↓
              ┌───────────┐          ┌───────────┐
Hybrid X → Balanced PD 1 → I → Coherent DSP → BER Analyzer ← PRBS Ref
Hybrid Y → Balanced PD 2 → Q
              └───────────┘          └───────────┘

Observations:
- OSA @ EDFA output
- Eye Diagram @ DSP output
- Power Meter @ fiber output
```

## 预期结果

完成后系统应该达到:
- 接收功率: -10 dBm 左右
- BER: < 10^-9
- Q因子: > 15 dB
- 眼图张开清晰

