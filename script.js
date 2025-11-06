document.addEventListener('DOMContentLoaded', () => {
    init();
    document.getElementById('calculate-btn').addEventListener('click', calculateCostsAndDisplay);
});

function init() {
    console.log('Application initialized.');
    // Load saved data if any
    loadSavedData();
    // Add input validation listeners
    addInputValidationListeners();
}

/**
 * 添加输入验证监听器
 */
function addInputValidationListeners() {
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('input', (event) => {
            validateInput(event.target);
        });
    });
}

/**
 * 验证输入字段
 * @param {HTMLElement} inputElement - 输入框元素
 */
function validateInput(inputElement) {
    if (inputElement.checkValidity()) {
        inputElement.classList.remove('invalid');
    } else {
        inputElement.classList.add('invalid');
    }
}

/**
 * 从DOM中获取所有输入值
 * @param {string} prefix - 输入字段ID的前缀 (e.g., 'fl-', 'tr-')
 * @returns {object} 包含所有输入值的对象
 */
function getInputs(prefix) {
    const getVal = (id) => parseFloat(document.getElementById(prefix + id).value) || 0;

    return {
        // 材料成本
        developerPrice: getVal('developer-price'),
        developerConsumption: getVal('developer-consumption'),
        platePrice: getVal('plate-price'),

        // 设备成本
        equipmentPrice: getVal('equipment-price'),
        depreciationYears: getVal('depreciation-years'),
        powerConsumption: getVal('power-consumption'),
        operatingTime: getVal('operating-time'),
        electricityPrice: getVal('electricity-price'),

        // 人工成本
        laborSalary: getVal('labor-salary'),
        workDays: getVal('work-days'),
        dailyHours: getVal('daily-hours'),

        // 环境成本
        wastewaterVolume: getVal('wastewater-volume'),
        wastewaterPrice: getVal('wastewater-price'),
        waterConsumption: getVal('water-consumption'),
        waterPrice: getVal('water-price'),
    };
}

/**
 * 计算免冲洗版和传统冲洗版的成本
 * @returns {object} 包含两种版材成本计算结果的对象
 */
function calculateCosts() {
    const flInputs = getInputs('fl-');
    const trInputs = getInputs('tr-');

    const calculateSinglePlateCost = (inputs) => {
        // 材料总成本 = ∑(单价×用量)
        const materialCost = 
            (inputs.developerPrice * inputs.developerConsumption) + 
            inputs.platePrice;

        // 设备折旧成本 = 设备价格/(折旧年限×12)
        const depreciationCost = inputs.depreciationYears > 0 ? inputs.equipmentPrice / (inputs.depreciationYears * 12) : 0;

        // 能耗成本 = 功率×运行时间×电价
        const energyCost = inputs.powerConsumption * inputs.operatingTime * inputs.electricityPrice;

        // 废水处理成本 = 废水量×处理单价
        const wastewaterTreatmentCost = inputs.wastewaterVolume * inputs.wastewaterPrice;

        // 清水消耗成本 = 清水消耗量 * 清水单价
        const waterConsumptionCost = inputs.waterConsumption * inputs.waterPrice;

        // 人工成本 = (工资/工作天数)/日工作时长 (这里假设是月工资，需要转换为每小时成本，再根据生产面积分摊)
        // 更合理的计算方式是：月工资 / (月工作天数 * 日工作时长) 得到每小时人工成本，再根据生产效率分摊到每平米
        // 暂时按照用户提供的公式进行计算，但需要注意其合理性
        const laborCost = (inputs.workDays * inputs.dailyHours) > 0 ? (inputs.laborSalary / inputs.workDays) / inputs.dailyHours : 0;

        const totalMonthlyCost = materialCost + depreciationCost + energyCost + wastewaterTreatmentCost + waterConsumptionCost + laborCost;
        
        // 假设基准面积为1000平米/月，这里需要用户输入或定义一个基准
        const baseArea = 1000; // 示例基准面积，实际应从用户输入获取
        const unitCost = baseArea > 0 ? totalMonthlyCost / baseArea : 0;

        return {
            materialCost,
            depreciationCost,
            energyCost,
            wastewaterTreatmentCost,
            waterConsumptionCost,
            laborCost,
            totalMonthlyCost,
            unitCost,
        };
    };

    const flResults = calculateSinglePlateCost(flInputs);
    const trResults = calculateSinglePlateCost(trInputs);

    return {
        fl: flResults,
        tr: trResults,
    };
}

/**
 * 计算成本并显示结果
 */
function calculateCostsAndDisplay() {
    // 检查所有必填项是否有效
    const allInputsValid = Array.from(document.querySelectorAll('input[required]')).every(input => input.checkValidity());
    if (!allInputsValid) {
        alert('请填写所有必填项并确保输入有效。');
        return;
    }

    const results = calculateCosts();
    console.log('Calculation Results:', results);
    displayComparisonTable(results);
    renderCharts(results);
    saveData(getInputs('fl-'), getInputs('tr-'));
}

let totalCostChartInstance = null;
let flCostCompositionChartInstance = null;
let trCostCompositionChartInstance = null;
let unitCostTrendChartInstance = null;

/**
 * 渲染所有Chart.js图表
 * @param {object} results - 包含免冲洗版和传统冲洗版成本计算结果的对象
 */
function renderCharts(results) {
    // 销毁现有图表实例以避免重复渲染问题
    if (totalCostChartInstance) totalCostChartInstance.destroy();
    if (flCostCompositionChartInstance) flCostCompositionChartInstance.destroy();
    if (trCostCompositionChartInstance) trCostCompositionChartInstance.destroy();
    if (unitCostTrendChartInstance) unitCostTrendChartInstance.destroy();

    // 总成本柱状对比图
    const totalCostCtx = document.getElementById('totalCostChart').getContext('2d');
    totalCostChartInstance = new Chart(totalCostCtx, {
        type: 'bar',
        data: {
            labels: ['免冲洗版', '传统冲洗版'],
            datasets: [{
                label: '总月成本 (元)',
                data: [results.fl.totalMonthlyCost, results.tr.totalMonthlyCost],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 99, 132, 0.6)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '成本 (元)'
                    }
                }
            }
        }
    });

    // 免冲洗版成本构成饼图
    const flCompositionCtx = document.getElementById('flCostCompositionChart').getContext('2d');
    flCostCompositionChartInstance = new Chart(flCompositionCtx, {
        type: 'pie',
        data: {
            labels: ['材料成本', '设备折旧成本', '能耗成本', '废水处理成本', '清水消耗成本', '人工成本'],
            datasets: [{
                data: [
                    results.fl.materialCost,
                    results.fl.depreciationCost,
                    results.fl.energyCost,
                    results.fl.wastewaterTreatmentCost,
                    results.fl.waterConsumptionCost,
                    results.fl.laborCost
                ],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                    'rgba(255, 159, 64, 0.6)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '免冲洗版成本构成'
                }
            }
        }
    });

    // 传统冲洗版成本构成饼图
    const trCompositionCtx = document.getElementById('trCostCompositionChart').getContext('2d');
    trCostCompositionChartInstance = new Chart(trCompositionCtx, {
        type: 'pie',
        data: {
            labels: ['材料成本', '设备折旧成本', '能耗成本', '废水处理成本', '清水消耗成本', '人工成本'],
            datasets: [{
                data: [
                    results.tr.materialCost,
                    results.tr.depreciationCost,
                    results.tr.energyCost,
                    results.tr.wastewaterTreatmentCost,
                    results.tr.waterConsumptionCost,
                    results.tr.laborCost
                ],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                    'rgba(255, 159, 64, 0.6)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '传统冲洗版成本构成'
                }
            }
        }
    });

    // 单位成本对比图 (原“单位成本趋势折线图”)
    const unitCostCtx = document.getElementById('unitCostTrendChart').getContext('2d');
    unitCostTrendChartInstance = new Chart(unitCostCtx, {
        type: 'bar',
        data: {
            labels: ['免冲洗版', '传统冲洗版'],
            datasets: [{
                label: '单位成本 (元/平米)',
                data: [results.fl.unitCost, results.tr.unitCost],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 159, 64, 0.6)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '单位成本 (元/平米)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: '单位成本对比'
                }
            }
        }
    });
}

/**
 * 动态生成并显示成本对比表格
 * @param {object} results - 包含免冲洗版和传统冲洗版成本计算结果的对象
 */
function displayComparisonTable(results) {
    const tableBody = document.querySelector('.comparison-table tbody');
    tableBody.innerHTML = ''; // 清空现有内容

    const costItems = [
        { label: '材料成本', key: 'materialCost' },
        { label: '设备折旧成本', key: 'depreciationCost' },
        { label: '能耗成本', key: 'energyCost' },
        { label: '废水处理成本', key: 'wastewaterTreatmentCost' },
        { label: '清水消耗成本', key: 'waterConsumptionCost' },
        { label: '人工成本', key: 'laborCost' },
        { label: '总月成本', key: 'totalMonthlyCost' },
        { label: '单位成本 (元/平米)', key: 'unitCost' },
    ];

    costItems.forEach(item => {
        const flValue = results.fl[item.key];
        const trValue = results.tr[item.key];
        const difference = flValue - trValue;
        const percentageDiff = trValue !== 0 ? (difference / trValue) * 100 : 0;

        const row = tableBody.insertRow();
        row.insertCell().textContent = item.label;

        const flCell = row.insertCell();
        flCell.textContent = flValue.toFixed(2);

        const trCell = row.insertCell();
        trCell.textContent = trValue.toFixed(2);

        const diffCell = row.insertCell();
        diffCell.textContent = difference.toFixed(2);

        // 高亮显示较低成本
        if (flValue < trValue) {
            flCell.classList.add('cost-lower');
        } else if (trValue < flValue) {
            trCell.classList.add('cost-lower');
        }

        // 差异超过10%显示特殊标识
        if (Math.abs(percentageDiff) > 10) {
            diffCell.classList.add('diff-significant');
            diffCell.title = `差异超过10% (${percentageDiff.toFixed(2)}%)`;
        }
    });
}

/**
 * 保存数据到localStorage
 * @param {object} flData - 免冲洗版输入数据
 * @param {object} trData - 传统冲洗版输入数据
 */
function saveData(flData, trData) {
    localStorage.setItem('flInputs', JSON.stringify(flData));
    localStorage.setItem('trInputs', JSON.stringify(trData));
    console.log('Data saved to localStorage.');
}

/**
 * 从localStorage加载数据
 */
function loadSavedData() {
    const flData = JSON.parse(localStorage.getItem('flInputs'));
    const trData = JSON.parse(localStorage.getItem('trInputs'));

    if (flData) {
        setInputs('fl-', flData);
    }
    if (trData) {
        setInputs('tr-', trData);
    }
    console.log('Data loaded from localStorage.');
}

/**
 * 将数据设置到输入字段
 * @param {string} prefix - 输入字段ID的前缀
 * @param {object} data - 要设置的数据
 */
function setInputs(prefix, data) {
    for (const key in data) {
        const element = document.getElementById(prefix + key.replace(/[A-Z]/g, match => '-' + match.toLowerCase()));
        if (element) {
            element.value = data[key];
            validateInput(element); // 加载后也进行验证
        }
    }
}