import React from "react";
import { hoistContextualValues } from "../index.js";

const Context = React.createContext(null);

const CtxProvider = Context.Provider;
const CtxConsumer = Context.Consumer;

const withContextProps = (WrappedComponent) => {
	const wrapper = React.forwardRef((props, ref) => {
		return (
			<CtxConsumer>
				{(providerValueProp) => {
					if (typeof props === "undefined") return null;

					let passProps = props
						? hoistContextualValues(props, {
								contexts: providerValueProp.contexts,
						  })
						: {};

					return (
						<WrappedComponent
							{...passProps}
							children={props.children}
							ref={ref}
						/>
					);
				}}
			</CtxConsumer>
		);
	});
	wrapper.displayName = `withContextProps(${
		WrappedComponent.displayName || WrappedComponent.name
	})`;
	return wrapper;
};

export { withContextProps, CtxProvider, CtxConsumer, Context };
