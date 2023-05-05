import React, { useState, useEffect } from "react";
import { withContextProps } from "./provider.js";

const Element = ({ children, ...props }) => {
	return children(props);
};

const CtxElement = withContextProps(Element);

export { CtxElement };
