import React, { Component, useState } from 'react'
import { useParams, useSearchParams, useNavigate, useLocation } from "react-router-dom"
import { Button } from 'antd';
import qs from 'querystring'

export default function Model() {

    let states = useState();
    let params = useParams();
    let location = useLocation();
    let navigate = useNavigate();
    let [searchParams, setSearchParams] = useSearchParams();
    console.log('useState参数为', states);
    console.log('useParams参数为', params);
    console.log('useLocation参数为', location);
    console.log('searchParams参数为', searchParams.get('title'));
    console.log('qs.stringify参数为', qs.stringify(params));
    console.log('qs.pars参数为', qs.parse(qs.stringify(params)));
    return (
        <div>
            <h3>
                this is Model
            </h3>
            
            <Button type="primary" onClick={() => navigate(-2)}>
                Go 2 pages back
            </Button>
            <Button type="primary" onClick={() => navigate(-1)}>Go back</Button>
            <Button type="primary" onClick={() => navigate(1)}>Go forward</Button>
            <Button type="primary" onClick={() => navigate(2)}>
                Go 2 pages forward
            </Button>

            <Button type="primary" onClick={() => {
                setSearchParams({ title: 'models'})
            }}>Search替换</Button>

            <Button type="primary" onClick={() => {
                navigate("/live2d/model/参数", { replace: true, state: {id:'01'}});
            }}>navigate回初始状态</Button>
        </div>
    )
}
