const { useState, useEffect, useRef } = React;

const Dashboard = () => {
  const [showModal, setShowModal] = useState(false);
  const [events, setEvents] = useState([]);
  const [formData, setFormData] = useState({
    eventName: "",
    eventDateFrom: "",   // Start date for the event
    eventDateTo: "",     // End date for the event
    venueName: "",
    operatingHours: "",  // If blank, backend uses "12:00 PM - 11:00 PM"
    selectedProducts: [],
    salesVolume: "",
    pricePerUnit: "",
    totalRevenue: "",
    saleHour: "",
    paymentMethod: "Cash"
  });
  const [newProduct, setNewProduct] = useState("");
  const [productOptions, setProductOptions] = useState([
    "Fosters", "Amstel", "Cruzcampo", "Birra Moretti", "Beavertown",
    "Strongbow", "Inch’s Medium Apple Cider", "Shipyard", "Somersby Apple",
    "Estrella", "Carlsberg", "Wainwrights", "Peroni", "Somersby Black",
    "San Miguel", "Tetley’s", "Kronenbourg", "Guinness", "Madri",
    "Carling", "Coors", "Worthington’s", "Caffrey’s", "Staropramen",
    "Pravha", "Strongbow Dark Fruit 50L", "John Smith’s", "Heineken"
  ]);
  const [csvFile, setCsvFile] = useState(null);

  // Chart references
  const pieChartRef = useRef(null);
  const [pieChartInstance, setPieChartInstance] = useState(null);
  const barChartRef = useRef(null);
  const [barChartInstance, setBarChartInstance] = useState(null);

  // Fetch events from API
  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/get-events");
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Update charts when events change
  useEffect(() => {
    updatePieChart();
    updateBarChart();
  }, [events]);

  // Calculate summary stats
  const totalRevenue = events.reduce(
    (acc, evt) => acc + (parseFloat(evt.total_revenue) || 0),
    0
  );
  const totalTransactions = events.length;
  const averageSpend =
    totalTransactions > 0 ? (totalRevenue / totalTransactions).toFixed(2) : 0;

  // Update Pie Chart: Sales breakdown by product
  const updatePieChart = () => {
    const productTotals = {};
    events.forEach((evt) => {
      let products = evt.products_sold;
      try {
        products = JSON.parse(evt.products_sold);
      } catch (err) {
        return;
      }
      products.forEach((product) => {
        productTotals[product] = (productTotals[product] || 0) + 1;
      });
    });
    const labels = Object.keys(productTotals);
    const data = Object.values(productTotals);

    if (pieChartInstance) {
      pieChartInstance.destroy();
    }
    const ctx = document.getElementById("salesPieChart").getContext("2d");
    const newChartInstance = new Chart(ctx, {
      type: "pie",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: [
              "#0d6efd",
              "#198754",
              "#ffc107",
              "#dc3545",
              "#6f42c1",
              "#fd7e14",
              "#20c997",
              "#0dcaf0",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
          title: { display: true, text: "Sales Breakdown by Product" },
        },
      },
    });
    setPieChartInstance(newChartInstance);
  };

  // Update Bar Chart: Hourly sales trends using saleHour from event data
  const updateBarChart = () => {
    const hourlyTotals = Array(24).fill(0);
    events.forEach((evt) => {
      const hour = parseInt(evt.sale_hour, 10);
      hourlyTotals[hour] += parseFloat(evt.sales_volume) || 0;
    });
    const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const data = hourlyTotals;

    if (barChartInstance) {
      barChartInstance.destroy();
    }
    const ctx = document.getElementById("salesBarChart").getContext("2d");
    const newChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Sales Volume",
            data: data,
            backgroundColor: "#0d6efd",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: "Hourly Sales Trends" },
        },
        scales: {
          x: { title: { display: true, text: "Hour of Day" } },
          y: { title: { display: true, text: "Sales Volume" } },
        },
      },
    });
    setBarChartInstance(newChartInstance);
  };

  const handleAddProduct = () => {
    if (newProduct.trim() && !productOptions.includes(newProduct)) {
      setProductOptions([...productOptions, newProduct.trim()]);
      setNewProduct("");
    }
  };

  const handleEditProduct = (oldProduct, newProductName) => {
    if (newProductName.trim() && !productOptions.includes(newProductName)) {
      const updatedProducts = productOptions.map((p) =>
        p === oldProduct ? newProductName.trim() : p
      );
      setProductOptions(updatedProducts);
      if (formData.selectedProducts.includes(oldProduct)) {
        const updatedSelected = formData.selectedProducts.map((p) =>
          p === oldProduct ? newProductName.trim() : p
        );
        setFormData({ ...formData, selectedProducts: updatedSelected });
      }
    }
  };

  const handleRemoveProduct = (product) => {
    const updatedProducts = productOptions.filter((item) => item !== product);
    setProductOptions(updatedProducts);
    if (formData.selectedProducts.includes(product)) {
      const updatedSelected = formData.selectedProducts.filter(
        (item) => item !== product
      );
      setFormData({ ...formData, selectedProducts: updatedSelected });
    }
  };

  const handleCheckboxChange = (product) => {
    setFormData((prevData) => {
      const selected = prevData.selectedProducts.includes(product)
        ? prevData.selectedProducts.filter((item) => item !== product)
        : [...prevData.selectedProducts, product];
      return { ...prevData, selectedProducts: selected };
    });
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [id]: value }));
  };

  const calculateTotalRevenue = () => {
    const { salesVolume, pricePerUnit } = formData;
    if (salesVolume && pricePerUnit) {
      return (parseFloat(salesVolume) * parseFloat(pricePerUnit)).toFixed(2);
    }
    return "";
  };

  // Handle file import (CSV or Excel)
  const handleFileImport = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      alert("Please select a file (CSV or Excel) to import.");
      return;
    }
    const formDataObj = new FormData();
    formDataObj.append("file", csvFile);
    try {
      const response = await fetch("/api/import-events", {
        method: "POST",
        body: formDataObj,
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        fetchEvents();
      } else {
        alert("Import failed: " + data.message);
      }
    } catch (error) {
      console.error("Error importing file:", error);
      alert("Error importing file.");
    }
  };

  // Handle Export PDF
  const handleExportPDF = async () => {
    try {
      const response = await fetch("/api/export-pdf");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "sales_report.pdf";
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        alert("Export failed: " + data.message);
      }
    } catch (error) {
      console.error("Error exporting PDF:", error);
      alert("Error exporting PDF.");
    }
  };

  // Handle Export Excel
  const handleExportExcel = async () => {
    try {
      const response = await fetch("/api/export-excel");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "sales_report.xlsx";
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        alert("Export failed: " + data.message);
      }
    } catch (error) {
      console.error("Error exporting Excel:", error);
      alert("Error exporting Excel.");
    }
  };

  const handleSubmit = async () => {
    const totalRevenueCalc = calculateTotalRevenue();
    const submittedData = {
      eventName: formData.eventName,
      eventDateFrom: formData.eventDateFrom, // Start date
      eventDateTo: formData.eventDateTo,     // End date
      venueName: formData.venueName,
      operatingHours: formData.operatingHours,
      selectedProducts: formData.selectedProducts,
      salesVolume: formData.salesVolume
        ? parseFloat(formData.salesVolume)
        : null,
      pricePerUnit: formData.pricePerUnit
        ? parseFloat(formData.pricePerUnit)
        : null,
      totalRevenue: totalRevenueCalc
        ? parseFloat(totalRevenueCalc)
        : null,
      saleHour: formData.saleHour,
      paymentMethod: formData.paymentMethod
    };

    try {
      const response = await fetch("/api/save-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submittedData),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Event saved successfully!");
        setFormData({
          eventName: "",
          eventDateFrom: "",
          eventDateTo: "",
          venueName: "",
          operatingHours: "",
          selectedProducts: [],
          salesVolume: "",
          pricePerUnit: "",
          totalRevenue: "",
          saleHour: "",
          paymentMethod: "Cash"
        });
        fetchEvents();
      } else {
        alert("Failed to save event: " + data.message);
      }
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Error saving event.");
    }
    setShowModal(false);
  };

  return (
    <div className="dashboard p-4">
      {/* SIDEBAR */}
      <div className="sidebar p-3">
        <h2 className="mb-4">Sales</h2>
        <a href="#" className="btn btn-light d-block mb-2">
          Dashboard
        </a>
      </div>

      {/* MAIN CONTENT */}
      <div className="main-content">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
          <h1 className="mb-0">Dashboard</h1>
          <div className="d-flex align-items-center flex-wrap gap-2">
            <button
              className="btn btn-primary me-2"
              onClick={() => setShowModal(true)}
            >
              Add Data
            </button>
            <div className="dropdown me-2">
              <button
                className="btn btn-primary dropdown-toggle"
                type="button"
                id="exportDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Export Report
              </button>
              <ul className="dropdown-menu" aria-labelledby="exportDropdown">
                <li>
                  <a
                    className="dropdown-item"
                    href="#"
                    onClick={handleExportPDF}
                  >
                    Export as PDF
                  </a>
                </li>
                <li>
                  <a
                    className="dropdown-item"
                    href="#"
                    onClick={handleExportExcel}
                  >
                    Export as Excel
                  </a>
                </li>
              </ul>
            </div>
            <form onSubmit={handleFileImport} className="d-flex gap-2">
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                className="form-control"
                onChange={(e) => setCsvFile(e.target.files[0])}
              />
              <button type="submit" className="btn btn-primary">
                Import File
              </button>
            </form>
          </div>
        </div>

        {/* CHARTS */}
        <div className="row mb-4 g-3">
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-body">
                <h5 className="card-title text-primary">Sales Distribution</h5>
                <canvas
                  id="salesPieChart"
                  style={{ width: "200px", height: "200px" }}
                ></canvas>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-body">
                <h5 className="card-title text-primary">Sales Over Time</h5>
                <canvas id="salesBarChart"></canvas>
              </div>
            </div>
          </div>
        </div>

        {/* SUMMARY TABLE */}
        <div className="card mb-4">
          <div className="card-body">
            <h3 className="mb-3 text-primary">Sale Summary</h3>
            <table className="table table-bordered">
              <tbody>
                <tr>
                  <th>Total Revenue</th>
                  <td>${totalRevenue.toFixed(2)}</td>
                </tr>
                <tr>
                  <th>Total Transactions</th>
                  <td>{totalTransactions}</td>
                </tr>
                <tr>
                  <th>Average Spend per Transaction</th>
                  <td>${averageSpend}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* EVENTS TABLE */}
        <div className="table-container">
          <div className="card">
            <div className="card-body">
              <h3 className="mb-3 text-primary">Event Data</h3>
              <table className="table table-striped table-bordered table-hover">
                <thead>
                  <tr>
                    <th>Event Name</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Venue</th>
                    <th>Operating Hours</th>
                    <th>Products Sold</th>
                    <th>Sales Volume</th>
                    <th>Price/Unit</th>
                    <th>Total Revenue</th>
                    <th>Sale Hour</th>
                    <th>Payment Method</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((evt) => {
                    let products = evt.products_sold;
                    try {
                      products = JSON.parse(evt.products_sold);
                    } catch (err) {}
                    return (
                      <tr key={evt.id}>
                        <td>{evt.event_name}</td>
                        <td>{evt.event_date_from}</td>
                        <td>{evt.event_date_to}</td>
                        <td>{evt.venue_name}</td>
                        <td>{evt.operating_hours}</td>
                        <td>
                          {Array.isArray(products)
                            ? products.join(", ")
                            : products}
                        </td>
                        <td>{evt.sales_volume}</td>
                        <td>{evt.price_per_unit}</td>
                        <td>{evt.total_revenue}</td>
                        <td>{evt.sale_hour}</td>
                        <td>{evt.payment_method}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL FOR ADDING EVENT */}
      {showModal && (
        <div className="modal" style={{ display: "block" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add Event Data</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <form>
                  <input
                    type="text"
                    id="eventName"
                    placeholder="Event Name"
                    value={formData.eventName}
                    onChange={handleChange}
                    className="form-control mb-3"
                  />
                  <input
                    type="date"
                    id="eventDateFrom"
                    placeholder="Event Start Date"
                    value={formData.eventDateFrom}
                    onChange={handleChange}
                    className="form-control mb-3"
                  />
                  <input
                    type="date"
                    id="eventDateTo"
                    placeholder="Event End Date"
                    value={formData.eventDateTo}
                    onChange={handleChange}
                    className="form-control mb-3"
                  />
                  <input
                    type="text"
                    id="venueName"
                    placeholder="Venue Name"
                    value={formData.venueName}
                    onChange={handleChange}
                    className="form-control mb-3"
                  />
                  <input
                    type="text"
                    id="operatingHours"
                    placeholder="12:00 PM - 11:00 PM"
                    value={formData.operatingHours}
                    onChange={handleChange}
                    className="form-control mb-3"
                  />
                  <input
                    type="number"
                    id="saleHour"
                    placeholder="Sale Hour (0-23)"
                    value={formData.saleHour}
                    onChange={handleChange}
                    className="form-control mb-3"
                    min="0"
                    max="23"
                  />
                  <select
                    id="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    className="form-control mb-3"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Contactless">Contactless</option>
                  </select>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Add a new product"
                      value={newProduct}
                      onChange={(e) => setNewProduct(e.target.value)}
                      className="form-control"
                    />
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={handleAddProduct}
                    >
                      +
                    </button>
                  </div>
                  <label>Select Products:</label>
                  <div
                    className="border p-2 rounded mb-3"
                    style={{ maxHeight: "150px", overflowY: "auto" }}
                  >
                    {productOptions.map((product, index) => (
                      <div
                        key={index}
                        className="d-flex align-items-center justify-content-between mb-2"
                      >
                        <div className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id={`product-${index}`}
                            checked={formData.selectedProducts.includes(product)}
                            onChange={() => handleCheckboxChange(product)}
                          />
                          <label
                            className="form-check-label"
                            htmlFor={`product-${index}`}
                          >
                            {product}
                          </label>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <button
                            type="button"
                            className="btn btn-warning btn-sm"
                            onClick={() => {
                              const newProductName = prompt(
                                "Edit product name:",
                                product
                              );
                              if (newProductName)
                                handleEditProduct(product, newProductName);
                            }}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRemoveProduct(product)}
                          >
                            −
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    className="border p-2 rounded mb-3 d-flex flex-wrap gap-2"
                    style={{ minHeight: "40px" }}
                  >
                    {formData.selectedProducts.map((product, index) => (
                      <span
                        key={index}
                        className="d-flex align-items-center bg-white p-2 rounded"
                      >
                        {product}
                        <button
                          type="button"
                          className="btn btn-danger btn-sm ms-2"
                          onClick={() => handleRemoveProduct(product)}
                        >
                          −
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    id="salesVolume"
                    placeholder="Sales Volume"
                    value={formData.salesVolume}
                    onChange={handleChange}
                    className="form-control mb-3"
                  />
                  <input
                    type="text"
                    id="pricePerUnit"
                    placeholder="Price per Unit"
                    value={formData.pricePerUnit}
                    onChange={handleChange}
                    className="form-control mb-3"
                  />
                  <input
                    type="text"
                    id="totalRevenue"
                    placeholder="Total Revenue"
                    value={calculateTotalRevenue()}
                    readOnly
                    className="form-control mb-3"
                  />
                </form>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmit}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ReactDOM.render(<Dashboard />, document.getElementById("root"));
