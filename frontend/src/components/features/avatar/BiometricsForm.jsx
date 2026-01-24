import React from "react";

const BiometricsForm = ({ formData, onInputChange }) => {
  return (
    <div className="form-section">
      <h3
        style={{
          borderBottom: "1px solid black",
          paddingBottom: "10px",
          marginBottom: "20px",
        }}
      >
        01 / BIOMETRICS
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginBottom: "15px",
        }}
      >
        <div className="input-group">
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            DISPLAY NAME
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={onInputChange}
            placeholder="ENTER NAME"
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid black",
            }}
          />
        </div>

        <div className="input-group">
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            GENDER
          </label>
          <select
            name="gender"
            value={formData.gender}
            onChange={onInputChange}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid black",
              borderRadius: 0,
              height: "41px",
            }}
          >
            <option value="FEMALE">FEMALE</option>
            <option value="MALE">MALE</option>
          </select>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
        }}
      >
        <div className="input-group">
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            HEIGHT (CM)
          </label>
          <input
            type="number"
            name="height"
            value={formData.height}
            onChange={onInputChange}
            placeholder="175"
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid black",
            }}
          />
        </div>
        <div className="input-group">
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            WEIGHT (KG)
          </label>
          <input
            type="number"
            name="weight"
            value={formData.weight}
            onChange={onInputChange}
            placeholder="65"
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid black",
            }}
          />
        </div>
      </div>

      <div className="input-group" style={{ marginTop: "15px" }}>
        <label
          style={{
            display: "block",
            fontSize: "12px",
            fontWeight: "bold",
            marginBottom: "5px",
          }}
        >
          BODY TYPE
        </label>
        <select
          name="bodyType"
          value={formData.bodyType}
          onChange={onInputChange}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid black",
            borderRadius: 0,
          }}
        >
          <option value="ATHLETIC">ATHLETIC</option>
          <option value="SLIM">SLIM</option>
          <option value="CURVY">CURVY</option>
          <option value="RECTANGULAR">RECTANGULAR</option>
        </select>
      </div>
    </div>
  );
};

export default BiometricsForm;
